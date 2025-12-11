const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Importa TODAS as funções do sistema
const { 
    processarSave, adicionarXP, uparAtributo, avancarTurnoCompleto, usarHabilidade, 
    adicionarElemento, adicionarExtra, adicionarItem, adicionarSkill, 
    gerarTextoFichaCompleta, gerarTextoCombate, calcularXPHistoria, descansarPersonagem,
    equiparItem, consumirItem, aplicarDano, criarServo, desvincularServo, transferirItem, 
    getServo, saveServo, corrigirEntrada, saveNPC, getNPCArquivo, registrarLog, capturarServo
} = require('./sistema');

const FOLDER_DB = './banco_de_fichas';
if (!fs.existsSync(FOLDER_DB)) fs.mkdirSync(FOLDER_DB);

// --- CONFIGURAÇÃO DE ADM (Game Masters) ---
// Coloque aqui os números dos ADMs. Formato: '55DD99999999@c.us'
const ADMINS = [
    '55999999999@c.us' 
];

const batalhasAtivas = new Map();
const desafiosPendentes = new Map();

// --- FUNÇÕES AUXILIARES LOCAIS ---
function getFichaLocal(id) {
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}.json`);
    if (fs.existsSync(caminho)) return JSON.parse(fs.readFileSync(caminho, 'utf-8'));
    return null;
}

function saveFichaLocal(id, dados) {
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}.json`);
    const backup = path.join(FOLDER_DB, `${safeId}_backup.json`);
    if (fs.existsSync(caminho)) fs.copyFileSync(caminho, backup);
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
    registrarLog(safeId, "Salvo via Bot", id);
}

function retrocederFicha(id) {
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}.json`);
    const backup = path.join(FOLDER_DB, `${safeId}_backup.json`);
    if (fs.existsSync(backup)) { 
        fs.copyFileSync(backup, caminho); 
        registrarLog(safeId, "Retroceder Usado", id);
        return true; 
    }
    return false;
}

function deleteFicha(id) {
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}.json`);
    if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
}

function extrairIdMencao(texto) {
    const match = texto.match(/@(\d+)/);
    if (match && match[1]) return `${match[1]}@c.us`;
    return null;
}

function verificarAparenciaUnica(novaAparencia, idAutor) {
    if (!novaAparencia || novaAparencia === "--" || novaAparencia.length < 3) return true;
    const arquivos = fs.readdirSync(FOLDER_DB);
    for (const arquivo of arquivos) {
        if (arquivo.includes(idAutor.replace(/[^a-zA-Z0-9]/g, '_'))) continue;
        if (arquivo.includes("NPC_") || arquivo.includes("SERVO") || arquivo.includes("backup")) continue; 
        try {
            const dados = JSON.parse(fs.readFileSync(path.join(FOLDER_DB, arquivo), 'utf-8'));
            if (dados.info && dados.info.aparencia && dados.info.aparencia.toLowerCase() === novaAparencia.toLowerCase()) return false;
        } catch (e) {}
    }
    return true;
}

// --- CLIENTE ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot RPG V8 (Detalhado) Online!'));

client.on('message', async msg => {
    if (!msg.body) return;
    const texto = msg.body.trim();
    const args = texto.split(" ");
    const comando = args[0].toLowerCase();
    const sender = msg.author || msg.from; 
    const isGM = ADMINS.includes(sender);

    // ==================================================================
    // 1. MENUS DETALHADOS (RESTAURADOS)
    // ==================================================================
    
    if (comando === '!menu') {
        return msg.reply(`📂 **SISTEMA**
• *!save* ➝ Salva a ficha.
• *!ficha* ➝ Vê a ficha completa.
• *!aparencias* ➝ Lista faceclaims.
• *!apagar* ➝ Deleta a ficha.

📈 **EVOLUÇÃO**
• *!xp [val]* ➝ Ganhar XP.
• *!up [attr] [qtd]* ➝ Gastar pontos.
• *!historia* ➝ XP narrativo.

⚔️ **COMBATE**
• *!cena* ➝ Turno (Regen/CDs).
• *!usar [nome]* ➝ Habilidade.
• *!dano / !curar* ➝ [val]
• *!descansar* ➝ Fim de batalha (Cura Total).

📚 **EXTRAS**
• *!addskill [nome]*
• *!additem [nome] [rar]*`);
    }

    if (comando === '!ajuda' || comando === '!menu aprendiz') {
        return msg.reply(`📜 **MANUAL DO SISTEMA RPG**
Este bot gerencia sua ficha, combate, inventário e evolução automaticamente. Abaixo estão todos os comandos disponíveis e como utilizá-los.

📂 **1. GESTÃO DE FICHA & SISTEMA**
_Comandos para criar, visualizar e proteger seu personagem._

**!save**
*O que faz:* Salva ou atualiza sua ficha no banco de dados.
*Como usar:* Copie o modelo padrão, preencha seus dados e envie. Em seguida, responda à mensagem da ficha com !save (ou cole a ficha logo após o comando).
*Proteção:* O bot impede que você use uma Aparência (Faceclaim) que já pertence a outro jogador.

**!ficha**
*O que faz:* Exibe sua Ficha Completa.
*Detalhes:* Mostra sua Lore (Nome, Idade, Personalidade), Nível, Rank, XP, Dinheiro e listas completas de Elementos, Habilidades e Itens.

**!status**
*O que faz:* Exibe sua Ficha de Combate.
*Detalhes:* Focado na luta. Mostra HP/MP atuais, Atributos finais (já somados com buffs e itens), Dano calculado, Defesa calculada, Tempos de Recarga (Cooldowns) e Efeitos Ativos.

**!aparencias**
*O que faz:* Lista todos os personagens (Faceclaims) que já estão em uso no RPG. Use isso antes de criar a ficha para não repetir personagem.

**!retroceder**
*O que faz:* A função de "Desfazer" (Undo).
*Uso:* Fez uma distribuição de pontos errada? Gastou XP sem querer? Use este comando para voltar sua ficha exatamente para o estado anterior à última alteração.

**!apagar**
*O que faz:* Deleta permanentemente sua ficha do banco de dados.

📈 **2. EVOLUÇÃO & PROGRESSÃO**
_Comandos para subir de nível e melhorar atributos._

**!xp [valor]**
*O que faz:* Adiciona XP ao seu personagem.
*Automático:* Se o XP encher a barra, o bot automaticamente sobe seu Nível, atualiza seu Rank, entrega seus Pontos Livres e restaura 100% de seu HP e MP (considerando que subir de nível geralmente ocorre após concluir uma missão).

**!historia [texto]**
*O que faz:* Calcula XP baseado na sua narração (Roleplay).
*Regra:* Conta as palavras do texto. Se atingir o mínimo (ex: 300 palavras), concede XP automaticamente.

**!pontos**
*O que faz:* Mostra quantos Pontos Livres você tem para gastar.

**!up [sigla] [quantidade]**
*O que faz:* Distribui seus pontos livres nos atributos.
*Siglas Aceitas:*
forca (Dano Físico / Carga)
vel (Velocidade / Iniciativa)
res (Resistência Física / Vida)
pm (Poder Mágico / Dano Mágico)
cm (Controle Mágico / Precisão Mágica)
rm (Resistência Mágica / Defesa Mágica)
prec (Precisão Física)
*Exemplo:* \`!up pm 5\` (Aumenta 5 em Poder Mágico).

⚔️ **3. SISTEMA DE COMBATE**
_Comandos para lutar, usar habilidades e gerenciar turnos._

**!batalha @jogador**
*O que faz:* Desafia outro player para um duelo (PvP). O bot cria um "link" entre vocês.

**!aceitar**
*O que faz:* Aceita o desafio de PvP. A partir daqui, você não precisa mais marcar o nome do oponente nos comandos de dano.

**!render**
*O que faz:* Desiste da batalha e encerra o modo PvP.

**!dano [valor] [alvo opcional]**
*O que faz:* Aplica dano.
*Inteligência:*
Se estiver em PvP: Aplica direto no oponente.
Se digitar nome (ex: \`!dano 50 Goblin\`): Aplica no alvo (se for um servo seu, ativa mecânicas de proteção).
Se usar sozinho (\`!dano 50\`): Aplica em você mesmo.
*Passivas:* Se você tiver servos e a habilidade "Vínculo/Transferência", o dano é redirecionado automaticamente para o servo.

**!curar [valor]**
*O que faz:* Recupera seu HP atual (respeitando o máximo).

**!usar [nome da habilidade]**
*O que faz:* Ativa uma Técnica ou Habilidade Extra.
*Automação:* O bot calcula o custo de MP, verifica se está em Cooldown (recarga), aplica os efeitos matemáticos na ficha e exibe o texto descritivo.

**!testeefeito [DanoBase] [RM_Inimigo]**
*O que faz:* Uma calculadora rápida para saber se uma magia de efeito (ex: Paralisia, Veneno) funcionou. Compara seu Dano Mágico Efetivo contra a Resistência Mágica Total do inimigo.

**!cena**
*O que faz:* Finaliza o seu turno.
*Automação:*
Regenera HP/MP passivamente.
Reduz a contagem de Cooldowns e Duração de Buffs.
Rola dados de sorte para Condições Inatas (ex: Teste de Loucura do Fardo da Eternidade).

**!descansar**
*O que faz:* Utilizado ao fim de uma missão ou em local seguro. Recupera 100% de HP/MP, zera todos os cooldowns e remove status negativos.

🎒 **4. INVENTÁRIO E EQUIPAMENTOS**
_Comandos para gerenciar itens._

**!additem [nome] [raridade]**
*O que faz:* Adiciona um item à sua mochila.
*Proteção:* Se o item for "Exclusivo" (criado por outro player), o bot não deixará você adicionar. Você precisará recebê-lo via !daritem.

**!equipar [nome do item] [slot]**
*O que faz:* Coloca o item em uso e soma os atributos dele na sua ficha.
*Slots:* mao_direita, mao_esquerda, armadura, acessorio ou ambas (para armas de duas mãos).
*Exemplo:* \`!equipar Espada de Ferro mao_direita\`.

**!consumir [nome do item]**
*O que faz:* Usa um item consumível (Poção, Comida) e aplica o efeito de cura/recuperação imediatamente, removendo-o da mochila.

**!daritem @jogador [nome do item]**
*O que faz:* Transfere um item da sua mochila para a de outro jogador. Essencial para comércio ou trocas.

💀 **5. NECROMANCIA & SERVOS**
_Comandos exclusivos para classes que controlam lacaios._

**!capturar** (Responda à ficha do inimigo)
*O que faz:* Transforma a ficha de um NPC ou Player derrotado em um "Servo" vinculado a você. Salva os atributos exatos que ele tinha em vida.

**!invocar [nome do servo]**
*O que faz:* Traz um servo capturado para o campo de batalha (Lista de Ativos).
*Nota:* Também serve para criar Constructos (seres de pura magia temporários).

**!guardar [nome do servo]**
*O que faz:* Recolhe o servo para a "Legião Oculta" (Sombra). Enquanto guardado, o servo recupera vida passivamente a cada !cena.

**!acordar [nome do servo]**
*O que faz:* Tenta despertar um servo que entrou em Hibernação (HP chegou a 0).
*Regra:* O servo precisa ser curado antes de acordar.

**!desvincular [nome do servo]**
*O que faz:* Liberta o servo (ou apaga ele da sua lista). Usado em casos de purificação ou dispensa.

📚 **6. ADIÇÕES (Mestre/Criação)**
_Comandos para aprender novas capacidades._

**!addskill [nome]**
*O que faz:* Adiciona uma Técnica criada ou Habilidade Extra à sua lista. O bot verifica se você tem permissão (autoria) para ter essa técnica.

**!addelemento [nome]**
*O que faz:* Desbloqueia um novo elemento mágico na sua ficha.

**!addextra [nome]**
*O que faz:* Adiciona uma Habilidade Extra do sistema (ex: Força Elevada).

**!addpontos [quantidade]**
*O que faz:* (Geralmente uso de GM) Força a adição de pontos livres sem precisar subir de nível.`);
    }

    // ==================================================================
    // 2. COMANDOS EXCLUSIVOS DE GM (Governança)
    // ==================================================================
    
    // !xp (GM Only)
    if (comando === '!xp') {
        if (!isGM) return msg.reply("⛔ Apenas GMs podem dar XP.");
        let idAlvo = (msg.mentionedIds && msg.mentionedIds[0]) || extrairIdMencao(texto);
        if (!idAlvo) return msg.reply("❌ Marque o player: `!xp 500 @Player`");
        
        const ficha = getFichaLocal(idAlvo);
        if (!ficha) return msg.reply("❌ Ficha não encontrada.");
        
        const val = parseInt(args[1]);
        const res = adicionarXP(ficha, val);
        saveFichaLocal(idAlvo, ficha);
        registrarLog(idAlvo, `Ganhou ${val} XP`, sender);
        
        let txt = `🌟 XP Adicionado!\n`;
        if (res.subiu) txt += `🎉 **LEVEL UP!** Nível ${res.nivel} (Rank ${res.rank})\n💚 HP/MP Restaurados!`;
        return client.sendMessage(msg.from, txt);
    }

    // !savenpc (GM Only)
    if (comando === '!savenpc') {
        if (!isGM) return msg.reply("⛔ Apenas GMs criam NPCs.");
        let conteudo = msg.hasQuotedMsg ? (await msg.getQuotedMessage()).body : texto.replace(/!savenpc/gi, "").trim();
        if (!conteudo) return msg.reply("⚠️ Cole a ficha.");
        const res = processarSave(conteudo);
        if (res.sucesso) {
            msg.reply(saveNPC(res.ficha));
        } else msg.reply("❌ Erro na ficha.");
        return;
    }

    // !narrar (GM Only)
    if (comando === '!narrar') {
        if (!isGM) return;
        const narrativa = texto.replace(/!narrar/i, "").trim();
        client.sendMessage(msg.from, `📜 **SISTEMA:**\n\n${narrativa}`);
        return;
    }

    // ==================================================================
    // 3. COMANDOS PÚBLICOS
    // ==================================================================

    if (comando === '!save' || comando === '!salvar') {
        let conteudo = msg.hasQuotedMsg ? (await msg.getQuotedMessage()).body : texto.replace(/!save|!salvar/gi, "").trim();
        if (!conteudo) return msg.reply("⚠️ Cole a ficha.");
        const res = processarSave(conteudo);
        if (res.sucesso) {
            if (!verificarAparenciaUnica(res.ficha.info.aparencia, sender)) return msg.reply(`🚫 **APARÊNCIA EM USO!**`);
            saveFichaLocal(sender, res.ficha);
            msg.reply(res.msg);
        } else msg.reply(`❌ Erro: ${res.msg}`);
    }

    if (comando === '!ficha') {
        const ficha = getFichaLocal(sender);
        if (ficha) return msg.reply(gerarTextoFichaCompleta(ficha));
        return msg.reply("❌ Use `!save` primeiro.");
    }

    if (comando === '!status') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return msg.reply("❌ Sem ficha.");
        return msg.reply(gerarTextoCombate(ficha));
    }

    if (comando === '!aparencias') {
        const arquivos = fs.readdirSync(FOLDER_DB);
        let lista = [];
        arquivos.forEach(file => {
            try {
                if(!file.includes("backup") && !file.includes("SERVO") && !file.includes("NPC_")) {
                    const dados = JSON.parse(fs.readFileSync(path.join(FOLDER_DB, file), 'utf-8'));
                    if (dados.info && dados.info.aparencia && dados.info.aparencia !== "--") lista.push(`- ${dados.info.aparencia} (${dados.nome})`);
                }
            } catch(e) {}
        });
        return msg.reply(`🎭 **APARÊNCIAS EM USO:**\n${lista.join("\n") || "Nenhuma."}`);
    }

    // --- COMBATE ---
    if (comando === '!batalha' || comando === '!desafiar') {
        let oponenteId = (msg.mentionedIds && msg.mentionedIds[0]) || extrairIdMencao(texto);
        if (!oponenteId) return msg.reply("❌ Mencione: `!batalha @Fulano`");
        if (oponenteId === sender) return msg.reply("❌ Não pode lutar contra si mesmo.");
        if (!getFichaLocal(sender) || !getFichaLocal(oponenteId)) return msg.reply("❌ Ambos precisam de ficha.");
        
        desafiosPendentes.set(oponenteId, sender);
        return client.sendMessage(msg.from, `⚔️ **DESAFIO!** Oponente, digite \`!aceitar\`!`, { mentions: [oponenteId] });
    }

    if (comando === '!aceitar') {
        const desafianteId = desafiosPendentes.get(sender);
        if (!desafianteId) return msg.reply("❌ Nenhum desafio.");
        batalhasAtivas.set(sender, desafianteId);
        batalhasAtivas.set(desafianteId, sender);
        desafiosPendentes.delete(sender);
        return msg.reply("🔔 **COMBATE INICIADO!** Use `!dano` sem nome.");
    }

    if (comando === '!render') {
        const oponenteId = batalhasAtivas.get(sender);
        if (!oponenteId) return msg.reply("❌ Não está em batalha.");
        batalhasAtivas.delete(sender);
        batalhasAtivas.delete(oponenteId);
        return msg.reply("🏳️ **Combate encerrado.**");
    }

    if (comando === '!dano') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const val = parseInt(args[1]);
        if (isNaN(val)) return msg.reply("❌ Use: `!dano [valor]`");

        let alvoFicha = ficha;
        let idAlvo = sender;
        let nomeAlvoTexto = args.slice(2).join(" ");
        const oponentePvP = batalhasAtivas.get(sender);

        if (!nomeAlvoTexto && oponentePvP) {
            alvoFicha = getFichaLocal(oponentePvP);
            idAlvo = oponentePvP;
        }

        const resultado = aplicarDano(alvoFicha, val, idAlvo, nomeAlvoTexto);
        saveFichaLocal(idAlvo, resultado.ficha);
        
        let msgFinal = resultado.log;
        if (oponentePvP && !nomeAlvoTexto) msgFinal = `⚔️ **PvP:** Ataque contra *${alvoFicha.nome}*!\n` + msgFinal;
        return msg.reply(msgFinal);
    }

    if (comando === '!cena') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const log = avancarTurnoCompleto(ficha, sender);
        saveFichaLocal(sender, ficha);
        msg.reply(log);
    }

    if (comando === '!descansar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = descansarPersonagem(ficha);
        saveFichaLocal(sender, ficha);
        msg.reply(res);
    }

    if (comando === '!curar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const val = parseInt(args[1]);
        if (isNaN(val)) return;
        ficha.status.hp_atual = Math.min(ficha.status.hp_max, ficha.status.hp_atual + val);
        saveFichaLocal(sender, ficha);
        msg.reply(`💚 HP: ${Math.floor(ficha.status.hp_atual)} / ${ficha.status.hp_max}`);
    }

    if (comando === '!usar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = usarHabilidade(ficha, args.slice(1).join(" "));
        saveFichaLocal(sender, ficha);
        msg.reply(res);
    }

    if (comando === '!testeefeito') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return msg.reply("❌ Sem ficha.");
        const danoBase = parseInt(args[1]);
        const rmAlvo = parseInt(args[2]);
        if (isNaN(danoBase) || isNaN(rmAlvo)) return msg.reply("❌ Use: `!testeefeito [Dano] [RM]`");
        const pm = ficha.atributos_totais.poder_magico;
        const dme = danoBase + (pm * 20);
        const rmt = rmAlvo * 2 * 20;
        msg.reply(`⚡ **Teste:**\n💥 DME: ${dme}\n🛡️ RMT: ${rmt}\nResultado: ${dme > rmt ? "✅ PEGOU!" : "❌ RESISTIU!"}`);
    }

    // --- PROGRESSÃO ---
    if (comando === '!up') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = uparAtributo(ficha, args[1], parseInt(args[2]));
        saveFichaLocal(sender, ficha);
        msg.reply(res);
    }

    if (comando === '!historia') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const historiaTexto = texto.replace(/!historia/gi, "").trim();
        const calc = calcularXPHistoria(historiaTexto);
        if (calc.xpTotal > 0) {
            // XP automático para players (Roleplay)
            const res = adicionarXP(ficha, calc.xpTotal); 
            saveFichaLocal(sender, ficha);
            let msgFinal = `${calc.msg}\n${res.subiu ? `🎉 **LEVEL UP!**` : `Total XP: ${ficha.xp}`}`;
            return msg.reply(msgFinal);
        } else {
            return msg.reply(calc.msg);
        }
    }

    // --- ITENS E SERVOS (PÚBLICOS OU MISTOS) ---
    
    // !additem, !addskill, !addelemento, !addextra, !addpontos
    // Estes comandos agora são GERALMENTE restritos, mas vamos manter a lógica de segurança:
    // Se for GM -> Faz tudo. Se for Player -> Só faz itens/skills que forem públicos ou tiverem permissão.
    if (['!additem', '!addskill', '!addelemento', '!addextra', '!addpontos'].includes(comando)) {
        if (isGM) {
            // Lógica de GM (Pode adicionar em qualquer um)
            let idAlvo = (msg.mentionedIds && msg.mentionedIds[0]) || extrairIdMencao(texto) || sender;
            const ficha = getFichaLocal(idAlvo);
            if (!ficha) return msg.reply("❌ Ficha não encontrada.");
            const nomeArg = texto.replace(/!add\w+|@\S+/gi, "").trim(); 
            
            if (comando === '!additem') msg.reply(adicionarItem(ficha, nomeArg, "Comum", sender));
            if (comando === '!addskill') msg.reply(adicionarSkill(ficha, nomeArg, sender));
            if (comando === '!addelemento') msg.reply(adicionarElemento(ficha, nomeArg));
            if (comando === '!addextra') msg.reply(adicionarExtra(ficha, nomeArg));
            if (comando === '!addpontos') { 
                const qtd = parseInt(args[1]) || parseInt(nomeArg); 
                ficha.pontos_livres += qtd; 
                msg.reply(`💎 +${qtd} pontos.`); 
            }
            saveFichaLocal(idAlvo, ficha);
            registrarLog(idAlvo, `GM ${comando}: ${nomeArg}`, sender);
        } else {
            // Lógica de Player (Só nele mesmo e com restrições de autoria)
            if (['!additem', '!addskill'].includes(comando)) {
               const ficha = getFichaLocal(sender);
               if (!ficha) return;
               const nomeArg = args.slice(1).join(" ");
               
               if (comando === '!additem') msg.reply(adicionarItem(ficha, nomeArg, "Comum", sender));
               if (comando === '!addskill') msg.reply(adicionarSkill(ficha, nomeArg, sender));
               saveFichaLocal(sender, ficha);
            } else {
                return msg.reply("⛔ Apenas GMs podem usar este comando.");
            }
        }
    }

    if (comando === '!equipar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = equiparItem(ficha, args.slice(1, args.length-1).join(" "), args[args.length-1]);
        saveFichaLocal(sender, ficha);
        msg.reply(res);
    }

    if (comando === '!consumir') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = consumirItem(ficha, args.slice(1).join(" "));
        saveFichaLocal(sender, ficha);
        msg.reply(res);
    }

    if (comando === '!daritem') {
        let idDestino = (msg.mentionedIds && msg.mentionedIds[0]) || extrairIdMencao(texto);
        if (!idDestino) return msg.reply("❌ Mencione alguém.");
        const nomeItem = texto.replace(/!daritem|!entregar|@\S+/gi, "").trim();
        if(!nomeItem) return msg.reply("❌ Nome do item?");
        const fichaOrigem = getFichaLocal(sender);
        const fichaDestino = getFichaLocal(idDestino);
        if (!fichaOrigem || !fichaDestino) return msg.reply("❌ Fichas não encontradas.");
        const res = transferirItem(fichaOrigem, fichaDestino, nomeItem);
        if (res.sucesso) {
            saveFichaLocal(sender, res.fichaOrigem);
            saveFichaLocal(idDestino, res.fichaDestino);
            msg.reply(res.msgOrigem);
            try { client.sendMessage(idDestino, res.msgDestino); } catch(e){}
        } else msg.reply(res.msg);
    }

    if (comando === '!vernpc') {
        const nome = args.slice(1).join(" ");
        const npc = getNPCArquivo(nome);
        if (npc) msg.reply(gerarTextoCombate(npc));
        else msg.reply("❌ NPC não encontrado.");
    }

    if (comando === '!capturar') {
        const fichaMestre = getFichaLocal(sender);
        if (!fichaMestre) return msg.reply("❌ Sem ficha.");
        let alvo = null;
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            const res = processarSave(quoted.body);
            if(res.sucesso) alvo = res.ficha;
        } else {
            alvo = args.slice(1).join(" "); // Nome do NPC
        }
        const res = capturarServo(sender, alvo);
        if (res.sucesso) {
            if(!fichaMestre.servos.ativos.includes(res.servo.nome)) fichaMestre.servos.ativos.push(res.servo.nome);
            saveFichaLocal(sender, fichaMestre);
            msg.reply(res.msg);
        } else msg.reply(res.msg);
    }

    if (comando === '!invocar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const nome = args.slice(1).join(" ");
        const res = criarServo(ficha, nome, "Constructo");
        saveFichaLocal(sender, ficha);
        saveServo(sender, nome, res.servo);
        msg.reply(res.msg);
    }

    if (comando === '!guardar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const nome = args.slice(1).join(" ");
        if (ficha.servos.ativos.includes(nome)) {
            ficha.servos.ativos = ficha.servos.ativos.filter(s => s !== nome);
            ficha.servos.guardados.push(nome);
            saveFichaLocal(sender, ficha);
            return msg.reply(`👥 **${nome}** recolhido para a sombra.`);
        }
        return msg.reply("❌ Não ativo.");
    }

    if (comando === '!acordar') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const nome = args.slice(1).join(" ");
        const s = getServo(sender, nome);
        if(s && s.status.hp_atual > 0 && ficha.servos.hibernando.includes(nome)) {
            ficha.servos.hibernando = ficha.servos.hibernando.filter(x=>x!==nome);
            ficha.servos.guardados.push(nome);
            saveFichaLocal(sender, ficha);
            msg.reply(`✨ ${nome} acordou!`);
        } else msg.reply("❌ Não pode acordar (HP 0 ou não existe).");
    }

    if (comando === '!desvincular') {
        const ficha = getFichaLocal(sender);
        if (!ficha) return;
        const res = desvincularServo(ficha, args.slice(1).join(" "));
        saveFichaLocal(sender, res.ficha);
        msg.reply(res.log);
    }

    if (comando === '!retroceder') {
        if (retrocederFicha(sender)) msg.reply("↩️ Desfeito.");
        else msg.reply("❌ Sem backup.");
    }

    if (comando === '!apagar') {
        deleteFicha(sender);
        msg.reply("🗑️ Apagado.");
    }
});

client.initialize();