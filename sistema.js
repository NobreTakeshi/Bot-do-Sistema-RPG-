// ==================================================================================
// ARQUIVO: sistema.js (Cérebro do RPG - V9 Final)
// ==================================================================================

const TECNICAS = require('./tecnicas');
const ITENS_DB = require('./itens');
const fs = require('fs');
const path = require('path');

const FOLDER_DB = './banco_de_fichas';
const FOLDER_LOGS = './logs_fichas';

if (!fs.existsSync(FOLDER_DB)) fs.mkdirSync(FOLDER_DB);
if (!fs.existsSync(FOLDER_LOGS)) fs.mkdirSync(FOLDER_LOGS);

const SISTEMA = {
    elementosPermitidos: ["Água", "Terra", "Fogo", "Vento", "Luz", "Trevas", "Arcano"], 
    classesSociais: {
        "Plebeu": { bonus: { resistencia: 10, forca: 8, velocidade: 6, mp: 100 } },
        "Nobre": { bonus: { forca: 6, velocidade: 5, resistencia: 6, controle_magico: 8, mp: 200 } },
        "Realeza": { bonus: { poder_magico: 10, controle_magico: 8, mp: 300 } }
    },
    classes: {
        "Guerreiro": { bonus: { forca: 15, resistencia: 15, hp: 150 } },
        "Necromante": { bonus: { poder_magico: 15, controle_magico: 15, mp: 150 } },
        "Mago": { bonus: { poder_magico: 20, controle_magico: 15, mp: 200 } },
        "Bárbaro": { bonus: { forca: 20, resistencia: 15, hp: 200 } },
        "Lutador": { bonus: { velocidade: 15, forca: 15, resistencia: 15 } },
        "Assassino": { bonus: { velocidade: 20, forca: 10, resistencia: 5 } },
        "Atirador": { bonus: { velocidade: 15, resistencia: 10, precisao: 10 } },
        "Feiticeiro": { bonus: { poder_magico: 20, resistencia_magica: 10, mp: 150 } },
        "Druida": { bonus: { controle_magico: 15, resistencia_magica: 15, mp: 150 } },
        "Bardo": { bonus: { resistencia_magica: 10, controle_magico: 15, velocidade: 10 } },
        "Tanque": { bonus: { resistencia: 20, resistencia_magica: 20, hp: 200 } },
        "Guardião": { bonus: { controle_magico: 15, resistencia_magica: 15, mp: 150 } }
    },
    condicoes: {
        "Nenhuma": {},

        // --- CONDIÇÃO: VAZIO ARCANO [cite: 3] ---
        "Vazio Arcano": {
            multiplicadores: { forca: 3, velocidade: 3, resistencia: 3 }, // [cite: 5]
            zerarMagia: true, // [cite: 5]
            buffItem: 0.60, // Canal Perfeito +60% [cite: 4]
            ignoreDef: 0.50, // Instinto Predatório [cite: 4]
            desc: "Sem mana. Caçador de magos físico perfeito."
        },

        // --- CONDIÇÃO: CONCHA QUEBRADA [cite: 6] ---
        "Concha Quebrada": {
            bonusFlat: { mp: 1000 }, // Mana Infinita [cite: 8]
            multiplicadores: { controle_magico: 4, poder_magico: 4 }, // [cite: 8]
            hpFixo: 500, // Corpo Frágil [cite: 8]
            vulnerabilidadeFisica: 0.25, // Vulnerabilidade Física +25% [cite: 8]
            buffMagia: 0.60, // Concentração Arcana +60% [cite: 8]
            efeitoTurno: (f) => null
        },

        // --- CONDIÇÃO: FLUXO INSTÁVEL [cite: 9] ---
        "Fluxo Instável": {
            bonusFlat: { mp: 2000 }, // Mana Caótica [cite: 11]
            multiplicadores: { poder_magico: 4 }, // Caos Consciente [cite: 14]
            efeitoTurno: (f, turno) => {
                // Explosão Aleatória (50% a cada 4 cenas -> aprox 12% por turno) [cite: 11]
                if (Math.floor(Math.random() * 100) + 1 <= 12) {
                    let dano = Math.floor(f.atributos_totais.poder_magico * 20 * 1.5);
                    f.status.hp_atual -= Math.floor(dano * 0.25); // Marcas da Dor [cite: 13]
                    return `💥 **Fluxo Instável:** EXPLOSÃO! Dano em área ${dano}. Você sofreu o ricochete.`;
                }
                // Fluxo Selvagem: HP < 10% recupera 60% MP [cite: 13]
                if (f.status.hp_atual < (f.status.hp_max * 0.10)) {
                    let regen = Math.floor(f.status.mp_max * 0.60);
                    f.status.mp_atual += regen;
                    return `🌀 **Fluxo Selvagem:** HP Crítico! Recuperou ${regen} MP.`;
                }
            }
        },

        // --- CONDIÇÃO: CORPO DE ESSÊNCIA [cite: 15] ---
        "Corpo de Essência": {
            regenExtra: 0.30, // Fluxo Vivo +30% Regen [cite: 20]
            // Imunidade parcial e vulnerabilidade oposta devem ser tratadas no cálculo de dano
            efeitoTurno: (f) => {
                // Aura Manifestada: Dano passivo por contato (10% PM) [cite: 17]
                let danoAura = Math.floor(f.atributos_totais.poder_magico * 0.10);
                return `🔥 **Aura Elemental:** Inimigos próximos sofrem ${danoAura} de dano automático.`;
            }
        },

        // --- CONDIÇÃO: VÍNCULO ESPIRITUAL [cite: 22] ---
        "Vínculo Espiritual": {
            resistenciaMagicaPercent: 0.30, // Proteção do Espírito -30% Dano Mágico [cite: 25]
            efeitoTurno: (f) => {
                // Corrupção Possível (1-20 em 1d100) [cite: 30, 31]
                if (Math.floor(Math.random() * 100) + 1 <= 20) {
                    return `👻 **Possessão:** O espírito tomou o controle por 2 turnos! (Atributos dobrados, sem controle).`;
                }
            }
        },

        // --- CONDIÇÃO: SANGUE ANTIGO  ---
        "Sangue Antigo": {
            // Equilíbrio: Tudo x2 [cite: 35, 36]
            multiplicadores: { poder_magico: 2, resistencia_magica: 2, forca: 2, resistencia: 2 },
            regenHP: 0.40, // Regeneração Imperfeita +40% HP [cite: 39]
            drenoMP: 0.10, // Custo -10% MP [cite: 39]
            efeitoTurno: (f, turno) => {
                // Sobrecarregamento: a cada 5 turnos -10% HP [cite: 37]
                if (turno > 0 && turno % 5 === 0) {
                    let dano = Math.floor(f.status.hp_max * 0.10);
                    f.status.hp_atual -= dano;
                    return `🩸 **Sangue Antigo:** Seu corpo sobrecarrega... -${dano} HP.`;
                }
            }
        },

        // --- CONDIÇÃO: ALMA FRAGMENTADA [cite: 41] ---
        "Alma Fragmentada": {
            vulnerabilidadeFisica: 0.10, // Fragilidade Física +10% Dano [cite: 49]
            efeitoTurno: (f) => {
                // Risco Emocional (1-15) [cite: 53]
                let dado = Math.floor(Math.random() * 100) + 1;
                if (dado <= 15) return `🎭 **Alma Fragmentada:** Você agiu contra sua vontade! (Ação oposta).`;
                // Chamado das Almas (1-20) [cite: 50]
                if (dado <= 20) return `😵 **Perda de Controle:** Sua outra alma assumiu por 1 turno.`;
            }
        },

        // --- CONDIÇÃO: CORPO EFÊMERO [cite: 54] ---
        "Corpo Efêmero": {
            multiplicadores: { velocidade: 2, controle_magico: 2 }, // Leveza e Afinidade x2 [cite: 57, 58]
            vulnerabilidadeFisica: 1.0, // Fragilidade Física (Dobro de dano) [cite: 59]
            efeitoTurno: (f) => {
                // Eco Etéreo: Se HP zerar, explode (Implementado no aplicarDano) [cite: 63]
                return null; 
            }
        },

        // --- CONDIÇÃO: SANGUE ANCESTRAL ---
        "Sangue Ancestral": {
            // Poder Bruto: PM x4 e Força x4 (Baseado na Herança Primordial/Força Divina)
            multiplicadores: { poder_magico: 4, forca: 4 },
            
            // Sobrecarrego Vital: Custo de Habilidade: +10% Dano no HP (Implementar no !usar)
            custoHpSkill: 0.10, 
            
            // Efeito por Turno: REMOVIDO (Agora é evento semanal de Sexta-feira)
            efeitoTurno: (f) => {
                return null; 
            }
        },

        // --- CONDIÇÃO: CORAÇÃO DE AÇO [cite: 75] ---
        "Coração de Aço": {
            multiplicadores: { forca: 4, resistencia: 4 }, // [cite: 79]
            bonusFlat: { hp: 2000 }, // Vitalidade Robusta [cite: 79]
            zerarMagia: true, // Incapacidade Mágica [cite: 80]
            regenHP: 0.50, // Vigor Inabalável +50% [cite: 79]
            efeitoTurno: (f) => null
        },

        // --- CONDIÇÃO: ECO DAS ESTRELAS [cite: 81] ---
        "Eco das Estrelas": {
            multiplicadores: { controle_magico: 3 }, // Intuição Elevada [cite: 85]
            efeitoTurno: (f) => {
                // Fragilidade Mental (1-60 sofre penalidade) [cite: 87]
                let dado = Math.floor(Math.random() * 100) + 1;
                if (dado <= 30) return `🌟 **Eco:** -20% Resistência Física (4 turnos).`;
                if (dado <= 60) {
                    let dano = Math.floor(f.status.hp_max * 0.20);
                    f.status.hp_atual -= dano;
                    return `🌟 **Eco:** Sobrecarga mental! -${dano} HP.`;
                }
            }
        },

        // --- CONDIÇÃO: FARDO DA ETERNIDADE [cite: 90] ---
        "Fardo da Eternidade": { 
            multiplicadores: { resistencia: 4 }, // [cite: 94]
            buffItem: 0.60, // Maestria em Itens [cite: 98]
            regenHP: 0.20, // Recuperação Lenta +20% [cite: 97]
            regenMP: 0.20, // [cite: 97]
            efeitoTurno: (f, turno) => {
                // Fragilidade Oculta: -5% HP a cada 10 turnos [cite: 96]
                if (turno > 0 && turno % 10 === 0) {
                    let dano = Math.floor(f.status.hp_max * 0.05); 
                    f.status.hp_atual -= dano;
                    return `⚠️ *Fardo:* O tempo cobra seu preço... -${dano} HP.`;
                }
                // Fardo Temporal: 10% Loucura [cite: 100, 101]
                if (Math.floor(Math.random()*100)+1 <= 10) {
                    return `🎲 *Fardo (Loucura):* 🌀 Ação imprudente!`;
                }
            }
        }
    },
    habilidadesRegras: {
        "Intensificação Mágica": { type: "ativo", cd: 3, duracao: 3, efeito: (f) => { f.combate.buffs.poder_magico = 2; f.combate.buffs.controle_magico = 2; return "✨ PM/CM x2"; } },
        "Cura Rápida": { type: "ativo", cd: 3, efeito: (f) => { let c = Math.floor(f.status.hp_max * 0.25); f.status.hp_atual += c; return `💚 +${c} HP`; } },
        "Força Elevada": { type: "passivo_stat", attribute: "forca", multi: 2 },
        "Velocidade Elevada": { type: "passivo_stat", attribute: "velocidade", multi: 2 },
        "Durabilidade de Aço": { type: "passivo_stat", attribute: "resistencia", multi: 2 },
        "Vitalidade Elevada": { type: "passivo_stat", especial: "hp_final", multi: 2 },
        "Arcanismo Supremo": { type: "passivo_stat", attribute: "poder_magico", multi: 2 },
        "Fonte Inesgotável": { type: "passivo_stat", especial: "mp_final", multi: 2 },
        "Precisão Elevada": { type: "passivo_stat", attribute: "precisao", multi: 2 }
    }
};

// --- FUNÇÕES DE ARQUIVO & AUDITORIA ---

function getServo(idMestre, nomeServo) {
    const safeId = idMestre.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}_SERVO_${nomeServo.toLowerCase()}.json`);
    if (fs.existsSync(caminho)) return JSON.parse(fs.readFileSync(caminho, 'utf-8'));
    return null;
}

function saveServo(idMestre, nomeServo, dados) {
    const safeId = idMestre.replace(/[^a-zA-Z0-9]/g, '_');
    const caminho = path.join(FOLDER_DB, `${safeId}_SERVO_${nomeServo.toLowerCase()}.json`);
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

function getNPCArquivo(nomeNpc) {
    const safeName = nomeNpc.trim().replace(/ /g, '_'); 
    const caminho = path.join(FOLDER_DB, `NPC_${safeName}.json`);
    if (fs.existsSync(caminho)) return JSON.parse(fs.readFileSync(caminho, 'utf-8'));
    return null;
}

function saveNPC(dados) {
    const safeName = dados.nome.trim().replace(/ /g, '_');
    const caminho = path.join(FOLDER_DB, `NPC_${safeName}.json`);
    dados.tipo = "NPC";
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
    return `👾 NPC **${dados.nome}** salvo no bestiário!`;
}

// LOGS
function registrarLog(idAlvo, acao, autorId) {
    const safeId = idAlvo.replace(/[^a-zA-Z0-9]/g, '_');
    const caminhoLog = path.join(FOLDER_LOGS, `${safeId}_history.txt`);
    const data = new Date().toLocaleString('pt-BR');
    const linha = `[${data}] AÇÃO: ${acao} | POR: ${autorId}\n`;
    try { fs.appendFileSync(caminhoLog, linha); } catch(e){}
}

// --- NOVO: Função para achar arquivo pelo campo "nome" dentro do JSON ---
function buscarFichaPorNome(nomeAlvo) {
    const arquivos = fs.readdirSync(FOLDER_DB);
    const nomeLimpo = nomeAlvo.toLowerCase().trim();

    for (const arquivo of arquivos) {
        // Ignora arquivos de sistema que não são fichas base
        if (arquivo.includes("backup") || arquivo.includes("SERVO")) continue;

        try {
            const caminho = path.join(FOLDER_DB, arquivo);
            const dados = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
            
            // Verifica se o nome na ficha bate com a busca
            if (dados.nome && dados.nome.toLowerCase().trim() === nomeLimpo) {
                return dados; // Retorna o objeto da ficha encontrada
            }
        } catch (e) {
            continue;
        }
    }
    return null; // Não achou ninguém
}

// --- FUNÇÕES AUXILIARES ---
function corrigirEntrada(entrada, lista) {
    if (!entrada) return null;
    return lista.find(item => item.toLowerCase() === entrada.toLowerCase().trim()) || null;
}

function recalcularStatus(ficha) {
    // 1. Começa com os Atributos Base (distribuídos pelo !up)
    let final = { ...ficha.atributos_base };
    
    // 2. Aplica Bônus de Classe Social
    const bSocial = SISTEMA.classesSociais[ficha.classe_social]?.bonus || {};
    for (let k in bSocial) if (final[k] !== undefined) final[k] += bSocial[k];

    // 3. Aplica Bônus de Classe (Multiplicado pelo Nível) - AQUI ESTÁ A MÁGICA
    const bClasse = SISTEMA.classes[ficha.classe]?.bonus || {};
    for (let k in bClasse) {
        if (final[k] !== undefined) {
            // Ex: Se Guerreiro dá 15 Força e Nível é 2 -> Soma +30
            final[k] += (bClasse[k] * ficha.nivel);
        }
    }

    // 4. Aplica Itens Equipados
    if (ficha.equipamentos) {
        for (let slot in ficha.equipamentos) {
            let item = ficha.equipamentos[slot];
            if (item) {
                let dadosItem = ITENS_DB[item.nome] || item;
                if (dadosItem.atributos) {
                    for (let k in dadosItem.atributos) if (final[k] !== undefined) final[k] += dadosItem.atributos[k];
                }
            }
        }
    }

    // 5. Multiplicadores de Condição Inata (ex: Vazio Arcano x3 Força)
    const cond = SISTEMA.condicoes[ficha.extras.condicao] || {};
    if (cond.multiplicadores) {
        for (let k in cond.multiplicadores) if (final[k] !== undefined) final[k] *= cond.multiplicadores[k];
    }

    // 6. Passivas e Buffs de Combate
    ficha.extras.habilidades_lista.forEach(habNome => {
        const habRegra = SISTEMA.habilidadesRegras[habNome];
        if (habRegra && habRegra.type === "passivo_stat" && habRegra.attribute) final[habRegra.attribute] *= habRegra.multi;
    });

    if (ficha.combate && ficha.combate.buffs) {
        for (let k in ficha.combate.buffs) if (final[k] !== undefined) final[k] *= ficha.combate.buffs[k];
    }

    // Zera magia se for Vazio Arcano ou Coração de Aço
    if (cond.zerarMagia) { 
        final.poder_magico = 0; 
        final.controle_magico = 0; 
        final.resistencia_magica = 0; 
    }

    // --- CÁLCULO FINAL DE HP e MP ---
    // HP Base = 100 + (Resistência Total * 5) + Bônus Fixo Classe/Social + (Bônus por Nível da Classe * Nivel)
    
    let hpMax = 100 + (final.resistencia * 5) + 
                (bSocial.hp || 0) + 
                ((bClasse.hp || 0) * ficha.nivel) + 
                (ficha.extras.bonus_nivel_hp || 0);

    let mpMax = 100 + (final.poder_magico * 5) + 
                (bSocial.mp || 0) + 
                ((bClasse.mp || 0) * ficha.nivel) + 
                (ficha.extras.bonus_nivel_mp || 0);

    // Ajustes Finais de HP/MP (Condições)
    if (cond.bonusFlat) { hpMax += (cond.bonusFlat.hp || 0); mpMax += (cond.bonusFlat.mp || 0); }
    if (cond.hpFixo) hpMax = cond.hpFixo;
    if (cond.zerarMagia) mpMax = 0;

    // Salva os totais
    let hpAntigo = ficha.status.hp_max || 0;
    let mpAntigo = ficha.status.mp_max || 0;
    
    ficha.atributos_totais = final;
    ficha.status.hp_max = hpMax;
    ficha.status.mp_max = mpMax;
    
    // Mantém a proporção de dano se o HP máximo subiu
    if (hpAntigo > 0 && hpMax > hpAntigo) ficha.status.hp_atual += (hpMax - hpAntigo);
    if (mpAntigo > 0 && mpMax > mpAntigo) ficha.status.mp_atual += (mpMax - mpAntigo);
    
    // Travas de segurança
    if (ficha.status.hp_atual > hpMax) ficha.status.hp_atual = hpMax;
    if (ficha.status.mp_atual > mpMax) ficha.status.mp_atual = mpMax;

    return ficha;
}

// --- AÇÕES COMBATE ---

function aplicarDano(fichaMestre, valor, idMestre, nomeAlvo = null) {
    let log = [];
    let danoRestante = valor;
    
    // --- 1. CÁLCULO DE VULNERABILIDADES (Condições Inatas) ---
    const condicao = SISTEMA.condicoes[fichaMestre.extras.condicao] || {};

    // Vulnerabilidade Física (Se o dano for considerado físico)
    // Concha Quebrada (+25%) , Alma Fragmentada (+10%) [cite: 49], Corpo Efêmero (+100%) 
    if (condicao.vulnerabilidadeFisica) {
        let extra = Math.floor(valor * condicao.vulnerabilidadeFisica);
        danoRestante += extra;
        log.push(`💔 **Condição Inata:** Fragilidade aumentou o dano em +${extra}.`);
    }

    // Resistência Mágica (Vínculo Espiritual -30%) [cite: 26]
    if (condicao.resistenciaMagicaPercent) {
        // Nota: Assumindo que este dano possa ser mitigado (no futuro, verificar tipo de dano)
        // let red = Math.floor(valor * condicao.resistenciaMagicaPercent);
        // danoRestante -= red;
        // log.push(`🛡️ **Espírito:** Proteção reduziu ${red} de dano.`);
    }

    // --- 2. LÓGICA DE ESCUDO E SERVOS (Transferência) ---
    let temEscudo = false;
    if (fichaMestre.equipamentos && fichaMestre.equipamentos.mao_esquerda) {
        if (fichaMestre.equipamentos.mao_esquerda.nome.includes("Égide do Vazio")) temEscudo = true;
    }

    const temTransferencia = fichaMestre.tecnicas.some(t => t.includes("Vínculo") || t.includes("Transferência"));
    let servoAlvo = null; 
    
    if (danoRestante > 0 && temTransferencia) {
        if (nomeAlvo) servoAlvo = getServo(idMestre, nomeAlvo);
        else if (fichaMestre.servos.ativos.length > 0) servoAlvo = getServo(idMestre, fichaMestre.servos.ativos[0]);
    }
    
    if (servoAlvo) {
        if (temEscudo) {
            let red = Math.floor(danoRestante * 0.10);
            danoRestante -= red;
            log.push(`🛡️ **Passiva (Égide):** -${red} dano no servo.`);
        }

        log.push(`🔗 **Vínculo:** Dano transferido para *${servoAlvo.nome}*!`);
        
        // Aplica dano no servo
        servoAlvo.status.hp_atual -= danoRestante;
        
        // Se o servo morrer/hibernar
        if (servoAlvo.status.hp_atual <= 0) {
            danoRestante = Math.abs(servoAlvo.status.hp_atual); // O que sobrou volta pro mestre? (Regra opcional, aqui zera)
            // Na sua regra, o dano excedente parece não voltar, mas o servo hiberna.
            danoRestante = 0; 
            servoAlvo.status.hp_atual = 0;
            log.push(`💤 Servo *${servoAlvo.nome}* entrou em **Hibernação**.`);
            
            fichaMestre.servos.ativos = fichaMestre.servos.ativos.filter(s => s !== servoAlvo.nome);
            if (!fichaMestre.servos.hibernando) fichaMestre.servos.hibernando = [];
            if (!fichaMestre.servos.hibernando.includes(servoAlvo.nome)) fichaMestre.servos.hibernando.push(servoAlvo.nome);

            if (fichaMestre.tecnicas.some(t => t.includes("Colheita"))) {
                if(!fichaMestre.combate.buffs["regen_mp_colheita"]) fichaMestre.combate.buffs["regen_mp_colheita"] = 0;
                fichaMestre.combate.buffs["regen_mp_colheita"] += 0.05;
                log.push(`🩸 **Colheita:** +5% Regen MP.`);
            }
        } else {
            danoRestante = 0;
            log.push(`💔 *${servoAlvo.nome}* HP: ${servoAlvo.status.hp_atual}/${servoAlvo.status.hp_max}`);
        }
        saveServo(idMestre, servoAlvo.nome, servoAlvo);
    } 

    // --- 3. APLICA DANO NO MESTRE (Se não tankou tudo) ---
    if (danoRestante > 0) {
        
        // Dissipação Parcial (Corpo Efêmero): Chance de negar dano crítico [cite: 60]
        if (fichaMestre.extras.condicao === "Corpo Efêmero" && danoRestante >= (fichaMestre.status.hp_max * 0.25)) {
            // Chance de 1-30% de negar
            if (Math.floor(Math.random()*100)+1 <= 30) {
                log.push(`👻 **Corpo Efêmero (Dissipação):** Você se desmaterializou e ignorou o dano crítico!`);
                danoRestante = 0;
            }
        }

        if (danoRestante > 0) {
            if (fichaMestre.combate.buffs["imune_magia"]) {
                log.push(`🛡️ **VÓRTICE DE NEGAÇÃO:** Dano anulado!`);
                if (fichaMestre.combate.buffs["absorver_mp"]) {
                    let ganho = Math.floor(valor * 0.5);
                    fichaMestre.status.mp_atual = Math.min(fichaMestre.status.mp_max, fichaMestre.status.mp_atual + ganho);
                    log.push(`💙 Absorveu ${ganho} MP.`);
                }
                danoRestante = 0;
            } else {
                fichaMestre.status.hp_atual -= danoRestante;
                
                // CHECAGEM DE MORTE E EXPLOSÕES FINAIS
                if (fichaMestre.status.hp_atual <= 0) {
                    fichaMestre.status.hp_atual = 0;
                    log.push(`💔 **${fichaMestre.nome}** recebeu ${danoRestante} e **DESMAIOU**!`);
                    
                    const pm = fichaMestre.atributos_totais.poder_magico * 20;

                    // Avatar Efêmero (Corpo de Essência) [cite: 21]
                    if (fichaMestre.extras.condicao === "Corpo de Essência") {
                        let danoExp = Math.floor(pm * 2.0); // 200%
                        log.push(`🔥 **Avatar Efêmero:** O corpo explode! ${danoExp} de dano em área (20m).`);
                    }
                    
                    // Eco de Impacto (Eco das Estrelas) [cite: 88]
                    if (fichaMestre.extras.condicao === "Eco das Estrelas") {
                        let danoExp = Math.floor(pm * 0.5); // 50%
                        log.push(`🌟 **Eco de Impacto:** Pulso estelar! ${danoExp} de dano em área (10m).`);
                    }

                    // Eco Etéreo (Corpo Efêmero) [cite: 63]
                    if (fichaMestre.extras.condicao === "Corpo Efêmero") {
                        if (Math.floor(Math.random()*100)+1 <= 25) { // 25% chance
                            let danoExp = Math.floor(pm * 0.5);
                            log.push(`👻 **Eco Etéreo:** Fragmentação de energia! ${danoExp} de dano em área.`);
                        }
                    }

                } else {
                    log.push(`💔 **${fichaMestre.nome}** recebeu ${danoRestante} dano! HP: ${fichaMestre.status.hp_atual}/${fichaMestre.status.hp_max}`);
                }
            }
        }
    }

    return { ficha: fichaMestre, log: log.join("\n") };
}

function avancarTurnoCompleto(ficha, idMestre) {
    if (!ficha.combate.turno_atual) ficha.combate.turno_atual = 0;
    ficha.combate.turno_atual++;
    let log = [`📜 *TURNO ${ficha.combate.turno_atual}*`];
    let recalculou = false;

    // --- 1. DURAÇÕES E COOLDOWNS ---
    for (let hab in ficha.combate.duracoes) {
        if (ficha.combate.duracoes[hab] > 0) {
            ficha.combate.duracoes[hab]--;
            if (ficha.combate.duracoes[hab] === 0) {
                log.push(`🔽 Efeito de *${hab}* acabou.`);
                ficha.combate.buffs = {}; recalculou = true;
                let regra = SISTEMA.habilidadesRegras[hab] || TECNICAS[hab];
                if (regra && regra.cd) { ficha.combate.cooldowns[hab] = regra.cd; log.push(`⏳ *${hab}* recarga (${regra.cd}t).`); }
            }
        }
    }
    for (let hab in ficha.combate.cooldowns) {
        if (ficha.combate.duracoes[hab] > 0) continue;
        if (ficha.combate.cooldowns[hab] > 0) {
            ficha.combate.cooldowns[hab]--;
            if (ficha.combate.cooldowns[hab] === 0) log.push(`✅ *${hab}* pronta!`);
        }
    }

    if (recalculou) recalcularStatus(ficha);
    
    // --- 2. REGENERAÇÃO AVANÇADA (CONDIÇÕES) ---
    const condicao = SISTEMA.condicoes[ficha.extras.condicao] || {};
    
    // Valores Base de Regen definidos no sistema.js
    let regenBaseHP = condicao.regenHP || 0; // Fardo (0.20), Sangue Antigo (0.40), Coração de Aço (0.50)
    let regenBaseMP = condicao.regenMP || 0; // Fardo (0.20)
    
    // Corpo de Essência: +30% HP/MP (Fluxo Vivo) 
    if (condicao.regenExtra) {
        regenBaseHP += condicao.regenExtra;
        regenBaseMP += condicao.regenExtra;
    }

    // Passiva de Necromante (Colheita)
    if (ficha.combate.buffs["regen_mp_colheita"]) regenBaseMP += ficha.combate.buffs["regen_mp_colheita"];
    
    let msgRegen = "";
    let custoDreno = 0;

    // Sangue Antigo: Drena 10% do MP TOTAL para curar HP 
    if (condicao.drenoMP) {
        custoDreno = Math.floor(ficha.status.mp_max * condicao.drenoMP);
        if (ficha.status.mp_atual >= custoDreno) {
            ficha.status.mp_atual -= custoDreno;
            msgRegen += ` (🩸 Dreno Vital -${custoDreno} MP)`;
        } else {
            // Se não tiver mana, não regenera o bônus do sangue (opcional, ou drena o que tem)
            ficha.status.mp_atual = 0;
            msgRegen += ` (🩸 Sem mana para Dreno Vital)`;
        }
    }

    if (regenBaseHP > 0 || regenBaseMP > 0) {
        let curaHP = Math.floor(ficha.status.hp_max * regenBaseHP);
        let curaMP = Math.floor(ficha.status.mp_max * regenBaseMP);
        
        // Aplica curas
        ficha.status.hp_atual = Math.min(ficha.status.hp_max, ficha.status.hp_atual + curaHP);
        ficha.status.mp_atual = Math.min(ficha.status.mp_max, ficha.status.mp_atual + curaMP);
        
        if(curaHP > 0) msgRegen += ` | 💚 +${curaHP} HP`;
        if(curaMP > 0) msgRegen += ` | 💙 +${curaMP} MP`;
    }
    
    if (msgRegen) log.push(`♻️ **Regeneração:**${msgRegen}`);

    // --- 3. EFEITOS DE TURNO (Necro/Condições) ---
    
    // Legião Oculta (Cura servos na sombra)
    if (ficha.tecnicas.some(t => t.includes("Legião")) && ficha.servos.guardados.length > 0) {
        let logL = [];
        ficha.servos.guardados.forEach(nome => {
            let s = getServo(idMestre, nome);
            if (s) {
                let r = Math.floor(s.status.hp_max * 0.10);
                s.status.hp_atual = Math.min(s.status.hp_max, s.status.hp_atual + r);
                saveServo(idMestre, nome, s);
                logL.push(`${s.nome} (+${r})`);
            }
        });
        if (logL.length) log.push(`👥 **Legião:** ${logL.join(", ")}`);
    }

    // Efeitos negativos/dados da Condição Inata (Ex: Fardo, Fluxo Instável)
    const condRegra = SISTEMA.condicoes[ficha.extras.condicao];
    if (condRegra && condRegra.efeitoTurno) {
        const res = condRegra.efeitoTurno(ficha, ficha.combate.turno_atual);
        if (res) log.push(res);
    }

    return log.join("\n") + "\n\n" + gerarTextoCombate(ficha);
}

function usarHabilidade(ficha, nomeBusca) {
    let nomeReal = null; let regra = null;
    ficha.extras.habilidades_lista.forEach(h => { if (h.toLowerCase().includes(nomeBusca.toLowerCase())) { nomeReal = h; regra = SISTEMA.habilidadesRegras[h]; } });
    if (!nomeReal) ficha.tecnicas.forEach(t => { if (t.toLowerCase().includes(nomeBusca.toLowerCase())) { nomeReal = t; regra = TECNICAS[t]; } });
    
    if (!nomeReal && ficha.equipamentos) {
        for (let slot in ficha.equipamentos) {
            let item = ficha.equipamentos[slot];
            if (item && item.skill && item.skill.toLowerCase().includes(nomeBusca.toLowerCase())) {
                nomeReal = item.skill;
                regra = TECNICAS[nomeReal]; 
            }
        }
    }

    if (!nomeReal) return "❌ Você não possui essa habilidade.";
    if (regra.type && regra.type.includes("passiv")) return `❌ *${nomeReal}* é passiva.`;
    if (ficha.combate.cooldowns[nomeReal] > 0) return `⏳ *${nomeReal}* em recarga (${ficha.combate.cooldowns[nomeReal]} turnos).`;
    if (ficha.combate.duracoes[nomeReal] > 0) return `⚠️ *${nomeReal}* já está ativa.`;
    if (regra.custo && ficha.status.mp_atual < regra.custo) return `❌ Sem MP! (Custo: ${regra.custo})`;

    if (regra.custo) ficha.status.mp_atual -= regra.custo;
    let resTexto = regra.desc;
    if (regra.efeito) { resTexto = regra.efeito(ficha); recalcularStatus(ficha); }
    
    if (regra.duracao) {
        ficha.combate.duracoes[nomeReal] = regra.duracao;
    } else {
        ficha.combate.cooldowns[nomeReal] = regra.cd;
    }

    return `⚔️ *${nomeReal}* ativado!\n${resTexto}`;
}

// --- PROGRESSÃO ---

function processarSave(texto) {
    const limpar = (t) => t ? t.trim() : "";
    const extrairNum = (r) => { const m = texto.match(r); return m ? parseInt(m[1].replace(/[^\d]/g,"")) : 0; };
    
    let nome = limpar(texto.match(/\*ɴᴏᴍᴇ:*\s*(.+)/g)?.[1]?.split(":")[1] || texto.match(/\*ɴᴏᴍᴇ:*\s*(.+)/g)?.[0]?.split(":")[1]); 
    if (!nome) { let m = [...texto.matchAll(/\*ɴᴏᴍᴇ:*\s*(.+)/g)]; nome = m.length > 1 ? m[1][1] : m[0]?.[1]; }
    
    if (nome) nome = nome.replace(/^\*\s*/, "").trim();

    let idade = "Desconhecida"; let mIdade = [...texto.matchAll(/\*ɪᴅᴀᴅᴇ:*\s*(.+)/g)]; if (mIdade.length >= 2) idade = limpar(mIdade[1][1]); else if (mIdade.length === 1) idade = limpar(mIdade[0][1]);
    let genero = limpar(texto.match(/\*ɢêɴᴇʀᴏ.*:\*\s*(.+)/)?.[1]) || "--";
    let personalidade = limpar(texto.match(/\*ᴩᴇʀꜱᴏɴᴀʟɪᴅᴀᴅᴇ:\*\s*(.+)/)?.[1]) || "--";
    let aparencia = limpar(texto.match(/\*ᴀᴩᴀʀêɴᴄɪᴀ.*:\*\s*(.+)/)?.[1]) || "--";

    const raw = {
        nome: limpar(nome), idade: idade, genero: genero, personalidade: personalidade, aparencia: aparencia,
        classe: corrigirEntrada(limpar(texto.match(/\*ᴄʟᴀꜱꜱᴇ:\*\s*(.+)/)?.[1]), Object.keys(SISTEMA.classes)),
        social: corrigirEntrada(limpar(texto.match(/\*ᴄʟᴀꜱꜱᴇ ꜱᴏᴄɪᴀʟ:\*\s*(.+)/)?.[1]), Object.keys(SISTEMA.classesSociais)),
        condicao: corrigirEntrada(limpar(texto.match(/\*ᴄᴏɴᴅɪçãᴏ ɪɴᴀᴛᴀ:\*\s*(.+)/)?.[1]), Object.keys(SISTEMA.condicoes)) || "Nenhuma",
        habilidade: limpar(texto.match(/《ʜᴀʙɪʟɪᴅᴀᴅᴇꜱ ᴇxᴛʀᴀꜱ》[\s\S]*?[\r\n]+\s*[—\-]\s*(.+)/)?.[1]),
        elemento: limpar(texto.match(/《ᴇʟᴇᴍᴇɴᴛᴏꜱ ᴍáɢɪᴄᴏꜱ》[\s\S]*?[\r\n]+\s*[—\-]\s*(.+)/)?.[1]),
        base: { forca: extrairNum(/\*— ꜰᴏʀçᴀ:\*\s*\[(\d+)\]/), velocidade: extrairNum(/\*— ᴠᴇʟᴏᴄɪᴅᴀᴅᴇ:\*\s*\[(\d+)\]/), resistencia: extrairNum(/\*— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ꜰíꜱɪᴄᴀ:\*\s*\[(\d+)\]/), poder_magico: extrairNum(/\*— ᴩᴏᴅᴇʀ ᴍáɢɪᴄᴏ:\*\s*\[(\d+)\]/), controle_magico: extrairNum(/\*— ᴄᴏɴᴛʀᴏʟᴇ ᴍáɢɪᴄᴏ:\*\s*\[(\d+)\]/), resistencia_magica: extrairNum(/\*— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ᴍáɢɪᴄᴀ:\*\s*\[(\d+)\]/), precisao: extrairNum(/\*— ᴩʀᴇᴄɪꜱãᴏ:\*\s*\[(\d+)\]/) }
    };

    if (!raw.classe || !raw.social) return { sucesso: false, msg: "Classe ou Classe Social inválida." };

    let habCorrigida = null; for (let k in SISTEMA.habilidadesRegras) if (raw.habilidade && raw.habilidade.toLowerCase().includes(k.toLowerCase())) habCorrigida = k;
    const listaHabs = habCorrigida ? [habCorrigida] : [];
    let elemCorrigido = corrigirEntrada(raw.elemento, SISTEMA.elementosPermitidos);
    const listaElems = elemCorrigido ? [elemCorrigido] : [];

    let ficha = {
        nome: raw.nome,
        info: { idade: raw.idade, genero: raw.genero, personalidade: raw.personalidade, aparencia: raw.aparencia },
        classe: raw.classe, classe_social: raw.social,
        nivel: 1, xp: 0, rank: "E", pontos_livres: 0,
        extras: { condicao: raw.condicao, habilidades_lista: listaHabs, elementos_lista: listaElems, itens: [], bonus_nivel_hp: 0, bonus_nivel_mp: 0 },
        tecnicas: [], atributos_base: raw.base,
        status: { hp_atual: 0, hp_max: 0, mp_atual: 0, mp_max: 0, invisivel: false },
        combate: { cooldowns: {}, buffs: {}, duracoes: {}, turno_atual: 0 },
        servos: { ativos: [], guardados: [], hibernando: [] },
        equipamentos: { mao_direita: null, mao_esquerda: null, armadura: null, acessorio: null }
    };

    ficha = recalcularStatus(ficha);
    ficha.status.hp_atual = ficha.status.hp_max;
    ficha.status.mp_atual = ficha.status.mp_max;

    return { sucesso: true, ficha: ficha, msg: `✅ Ficha de *${ficha.nome}* criada!` };
}

function adicionarXP(ficha, valor) {
    ficha.xp += valor;
    let subiu = false;
    let xpNecessario = ficha.nivel * 100;
    while (ficha.xp >= xpNecessario && ficha.nivel < 100) {
        ficha.xp -= xpNecessario;
        ficha.nivel++;
        subiu = true;
        ficha.pontos_livres += 5;
        if (!ficha.extras.bonus_nivel_hp) ficha.extras.bonus_nivel_hp = 0;
        if (!ficha.extras.bonus_nivel_mp) ficha.extras.bonus_nivel_mp = 0;
        ficha.extras.bonus_nivel_hp += 50;
        ficha.extras.bonus_nivel_mp += 50;
        let novoRank = "E";
        if (ficha.nivel >= 96) novoRank = "SS";
        else if (ficha.nivel >= 86) novoRank = "S";
        else if (ficha.nivel >= 71) novoRank = "A";
        else if (ficha.nivel >= 51) novoRank = "B";
        else if (ficha.nivel >= 31) novoRank = "C";
        else if (ficha.nivel >= 16) novoRank = "D";
        if (novoRank !== ficha.rank) {
            ficha.rank = novoRank;
            ficha.pontos_livres += 10;
            ficha.extras.bonus_nivel_hp += 100;
            ficha.extras.bonus_nivel_mp += 100;
        }
        xpNecessario = ficha.nivel * 100;
    }
    if (subiu) {
        recalcularStatus(ficha);
        ficha.status.hp_atual = ficha.status.hp_max;
        ficha.status.mp_atual = ficha.status.mp_max;
    }
    return { subiu, nivel: ficha.nivel, rank: ficha.rank, pontos: ficha.pontos_livres };
}

function descansarPersonagem(ficha) {
    recalcularStatus(ficha);
    ficha.status.hp_atual = ficha.status.hp_max;
    ficha.status.mp_atual = ficha.status.mp_max;
    ficha.combate = { cooldowns: {}, buffs: {}, duracoes: {}, turno_atual: 0 };
    ficha.status.invisivel = false;
    return `⛺ **${ficha.nome} montou acampamento...**\n✅ HP e MP Restaurados.\n✅ Status Normalizados.`;
}

// --- FUNÇÕES ADD E OUTRAS ---

function adicionarSkill(ficha, nomeSkill, idSolicitante, isGM = false) {
    let nomeReal = null;
    let regra = null;

    // 1. Busca a técnica no banco (Grimório)
    for (let k in TECNICAS) {
        if (k.toLowerCase() === nomeSkill.toLowerCase()) {
            nomeReal = k;
            regra = TECNICAS[k];
        }
    }

    // 2. Validações Básicas
    if (!nomeReal) return "❌ Técnica não encontrada no grimório.";
    if (ficha.tecnicas.includes(nomeReal)) return "❌ O personagem já possui essa técnica.";

    // 3. A LÓGICA DE OURO (Permissão)
    
    // Se a técnica NÃO é pública...
    if (!regra.publica) {
        // ... E quem pediu NÃO é GM...
        if (!isGM) {
            // ... Então TEM que estar na lista de donos!
            if (!regra.donos || !regra.donos.includes(idSolicitante)) {
                return `⛔ **Acesso Negado:** A técnica *${nomeReal}* é exclusiva. Você não é o criador nem um GM.`;
            }
        }
        // Se for GM, ele pula esse IF e aprova direto.
    }

    // 4. Sucesso
    ficha.tecnicas.push(nomeReal);
    return `📚 Técnica *${nomeReal}* aprendida com sucesso!`;
}

function adicionarElemento(ficha, novoElemento) {
    const validado = corrigirEntrada(novoElemento, SISTEMA.elementosPermitidos);
    if (!validado) return "❌ Elemento inválido.";
    if (ficha.extras.elementos_lista.includes(validado)) return "❌ Já possui.";
    ficha.extras.elementos_lista.push(validado);
    return `✅ Elemento *${validado}* adicionado!`;
}

function adicionarExtra(ficha, novaHab) {
    let habCorrigida = null;
    for (let k in SISTEMA.habilidadesRegras) if (novaHab.toLowerCase() === k.toLowerCase()) habCorrigida = k;
    if (!habCorrigida) return "❌ Habilidade inválida.";
    if (ficha.extras.habilidades_lista.includes(habCorrigida)) return "❌ Já possui.";
    ficha.extras.habilidades_lista.push(habCorrigida);
    recalcularStatus(ficha);
    return `✅ Habilidade *${habCorrigida}* adicionada!`;
}

function adicionarItem(ficha, nomeInput, raridadeIgnorada, idSolicitante) {
    let itemDB = null;
    let nomeReal = "";

    // 1. Busca no Banco de Dados (Case Insensitive)
    for (let key in ITENS_DB) {
        if (key.toLowerCase() === nomeInput.toLowerCase().trim()) {
            itemDB = ITENS_DB[key];
            nomeReal = key;
            break;
        }
    }

    // 2. TRAVA DE SEGURANÇA: Se não existe no itens.js, BLOQUEIA.
    if (!itemDB) {
        return `❌ **Erro:** O item *"${nomeInput}"* não existe no sistema (itens.js).\nVerifique a grafia exata ou peça para o Programador adicionar.`;
    }

    // 3. Verificação de Exclusividade (Item de outro player)
    // Se o item tem dono e quem pediu não é o dono (e assumindo que GMs podem burlar isso no index, aqui é trava final)
    if (itemDB.donoOriginal && itemDB.donoOriginal !== idSolicitante) {
        return `⛔ **Exclusivo:** Este item pertence a outro jogador e não pode ser gerado.`;
    }

    if (!ficha.extras.itens) ficha.extras.itens = [];

    // 4. Adiciona o item com os dados REAIS do banco
    ficha.extras.itens.push({
        nome: nomeReal,
        raridade: itemDB.raridade, // Pega automaticamente do itens.js
        slot: itemDB.slot,
        skill: itemDB.skill,
        atributos: itemDB.atributos
    });

    return `🎒 **Item Adicionado:** ${nomeReal}\n✨ Raridade: ${itemDB.raridade}\n📍 Slot: ${itemDB.slot}`;
}

function uparAtributo(ficha, atributo, qtd) {
    if (!atributo) return "❌ Erro: Informe o atributo. Ex: `!up forca 5`";
    if (!qtd || isNaN(qtd)) return "❌ Erro: Informe a quantidade.";

    const mapa = { "forca": "forca", "vel": "velocidade", "res": "resistencia", "pm": "poder_magico", "cm": "controle_magico", "rm": "resistencia_magica", "prec": "precisao" };
    let attrKey = mapa[atributo.toLowerCase()] || atributo.toLowerCase();
    
    if (ficha.atributos_base[attrKey] === undefined) return "Atributo inválido.";
    if (ficha.pontos_livres < qtd) return "Pontos insuficientes.";
    
    ficha.atributos_base[attrKey] += qtd;
    ficha.pontos_livres -= qtd;
    
    recalcularStatus(ficha);
    return `✅ +${qtd} em ${attrKey.toUpperCase()}. Pontos restantes: ${ficha.pontos_livres}`;
}

function equiparItem(ficha, nomeItem, slotAlvo) {
    const index = ficha.extras.itens.findIndex(i => i.nome.toLowerCase() === nomeItem.toLowerCase());
    if (index === -1) return "❌ Item não encontrado na mochila.";
    const item = ficha.extras.itens[index];
    
    let itemDB = ITENS_DB[item.nome] || item;
    let slot = slotAlvo.toLowerCase().replace(" ", "_");
    
    if (itemDB.slot && itemDB.slot !== slot && itemDB.slot !== "ambas") 
        return `❌ Este item deve ser equipado em: ${itemDB.slot}`;
    
    if (itemDB.slot === "ambas") {
        if (slot !== "mao_direita" && slot !== "mao_esquerda") return "❌ Armas de duas mãos devem ir na 'mao_direita'.";
        if (ficha.equipamentos.mao_direita) ficha.extras.itens.push(ficha.equipamentos.mao_direita);
        if (ficha.equipamentos.mao_esquerda) ficha.extras.itens.push(ficha.equipamentos.mao_esquerda);
        ficha.equipamentos.mao_direita = item;
        ficha.equipamentos.mao_esquerda = { nome: "(Ocupado: Duas Mãos)", tipo: "Bloqueio" }; 
    } else {
        if (ficha.equipamentos[slot]) ficha.extras.itens.push(ficha.equipamentos[slot]);
        ficha.equipamentos[slot] = item;
    }

    ficha.extras.itens.splice(index, 1);
    recalcularStatus(ficha);
    return `⚔️ Equipado: **${item.nome}** em ${slot}.`;
}

function consumirItem(ficha, nomeItem) {
    const index = ficha.extras.itens.findIndex(i => i.nome.toLowerCase() === nomeItem.toLowerCase());
    if (index === -1) return "❌ Item não encontrado.";
    const item = ficha.extras.itens[index];
    let msg = `🍽️ Consumiu ${item.nome}.`;
    if (item.nome.toLowerCase().includes("poção")) {
        let r = Math.floor(ficha.status.hp_max * 0.20);
        ficha.status.hp_atual = Math.min(ficha.status.hp_max, ficha.status.hp_atual + r);
        msg += ` (+${r} HP)`;
    }
    ficha.extras.itens.splice(index, 1);
    return msg;
}

function transferirItem(fichaOrigem, fichaDestino, nomeItem) {
    const index = fichaOrigem.extras.itens.findIndex(i => i.nome.toLowerCase() === nomeItem.toLowerCase());
    if (index === -1) return { sucesso: false, msg: "❌ Você não tem este item na mochila para dar." };
    
    const item = fichaOrigem.extras.itens[index];
    if (!fichaDestino.extras.itens) fichaDestino.extras.itens = [];
    fichaDestino.extras.itens.push(item);
    fichaOrigem.extras.itens.splice(index, 1);
    
    return { 
        sucesso: true, 
        msgOrigem: `📤 Você entregou **${item.nome}**.`,
        msgDestino: `📥 Você recebeu **${item.nome}**!`,
        fichaOrigem: fichaOrigem,
        fichaDestino: fichaDestino
    };
}

function criarServo(fichaMestre, nomeServo, tipoServo) {
    let pm = fichaMestre.atributos_totais.poder_magico;
    let cm = fichaMestre.atributos_totais.controle_magico;
    let stats = {
        forca: Math.floor(pm * 1.5), resistencia: Math.floor(pm * 1.5), velocidade: Math.floor(cm * 1.5),
        poder_magico: Math.floor(pm), hp_max: Math.floor((pm * 20) * 0.15), mp_max: 100
    };
    let servo = { nome: nomeServo, tipo: tipoServo, atributos: stats, status: { hp_atual: stats.hp_max, hp_max: stats.hp_max, mp_atual: stats.mp_max, mp_max: stats.mp_max } };
    if (!fichaMestre.servos) fichaMestre.servos = { ativos: [], guardados: [], hibernando: [] };
    fichaMestre.servos.ativos.push(nomeServo);
    return { servo: servo, msg: `🤖 Servo **${nomeServo}** criado!` };
}

function desvincularServo(fichaMestre, nomeServo) {
    if (fichaMestre.servos) {
        fichaMestre.servos.ativos = fichaMestre.servos.ativos.filter(s => s !== nomeServo);
        fichaMestre.servos.guardados = fichaMestre.servos.guardados.filter(s => s !== nomeServo);
        fichaMestre.servos.hibernando = fichaMestre.servos.hibernando.filter(s => s !== nomeServo);
    }
    return { ficha: fichaMestre, log: `✨ **${nomeServo}** desvinculado.` };
}

// --- ATUALIZAÇÃO: capturarServo Inteligente ---
function capturarServo(idMestre, fichaAlvoOuNome) {
    let servo = null;

    // CASO 1: O argumento é um NOME (String)
    if (typeof fichaAlvoOuNome === 'string') {
        const nomeBusca = fichaAlvoOuNome;

        // 1. Tenta achar como NPC (Pelo nome do arquivo)
        let alvo = getNPCArquivo(nomeBusca);
        
        // 2. Se não for NPC, tenta achar como PLAYER (Varrendo arquivos pelo nome interno)
        if (!alvo) {
            alvo = buscarFichaPorNome(nomeBusca);
        }

        if (!alvo) {
            return { sucesso: false, msg: `❌ Não encontrei nenhuma alma (NPC ou Player) chamada **"${nomeBusca}"** no banco de dados.` };
        }
        
        // Clona a ficha encontrada
        servo = JSON.parse(JSON.stringify(alvo));
    } 
    // CASO 2: O argumento já é um Objeto Ficha (Veio de uma resposta/quote no zap)
    else {
        servo = JSON.parse(JSON.stringify(fichaAlvoOuNome));
    }
    
    // Configura como Servo
    servo.tipo = "Servo"; 
    servo.mestre = idMestre;
    // Reseta combate para vir limpo
    servo.combate = { cooldowns: {}, buffs: {}, duracoes: {}, turno_atual: 0 };
    // Opcional: Define HP como cheio ao reviver/transformar em sombra
    servo.status.hp_atual = servo.status.hp_max;
    
    // Salva o arquivo de vínculo (Ex: 5599..._SERVO_Kael.json)
    saveServo(idMestre, servo.nome, servo);
    
    return { sucesso: true, servo: servo, msg: `💀 A alma de **${servo.nome}** foi capturada e agora serve a você!` };
}

function gerarTextoFichaCompleta(ficha) {
    const listarSlots = (lista, niveis) => {
        let txt = ""; let max = 1 + niveis.length;
        for(let i=0; i<max; i++) {
            if (lista[i]) txt += `— ${lista[i]}\n`;
            else { let req = i === 0 ? 0 : niveis[i-1]; txt += ficha.nivel >= req ? `— [Vazio]\n` : `— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.${req < 10 ? "0"+req : req})\n`; }
        }
        return txt;
    };
    const listarItens = () => {
        let txt = "";
        if (!ficha.extras.itens || ficha.extras.itens.length === 0) return `— ʟɪʙᴇʀᴀᴅᴏ (Vazio)\n— ʟɪʙᴇʀᴀᴅᴏ (Vazio)\n— ʙʟᴏqᴜᴇᴀᴅᴏ 🔒\n— ʙʟᴏqᴜᴇᴀᴅᴏ 🔒\n— ʙʟᴏqᴜᴇᴀᴅᴏ 🔒`;
        ficha.extras.itens.forEach(i => txt += `— ${i.nome} (${i.raridade})\n`);
        if (ficha.extras.itens.length < 5) txt += `— ʙʟᴏqᴜᴇᴀᴅᴏ 🔒\n`.repeat(5 - ficha.extras.itens.length);
        return txt;
    };

    return `*《ᴅᴀᴅᴏꜱ ᴅᴇ ᴊᴏɢᴀᴅᴏʀ》*
*ɴᴏᴍᴇ:* [Player]
*ɪᴅᴀᴅᴇ:* --
*ᴅɪꜱᴩᴏɴɪʙɪʟɪᴅᴀᴅᴇ:* --

*《ᴅᴀᴅᴏꜱ ᴅᴇ ᴩᴇʀꜱᴏɴᴀɢᴇᴍ 》*
*ɴᴏᴍᴇ:* ${ficha.nome}
*ɪᴅᴀᴅᴇ:* ${ficha.info.idade}
*ɢêɴᴇʀᴏ (ᴍ/ꜰ):* ${ficha.info.genero}
*ᴩᴇʀꜱᴏɴᴀʟɪᴅᴀᴅᴇ:* ${ficha.info.personalidade}
*ᴄʟᴀꜱꜱᴇ:* ${ficha.classe}
*ᴄʟᴀꜱꜱᴇ ꜱᴏᴄɪᴀʟ:* ${ficha.classe_social}
*ᴄᴏɴᴅɪçãᴏ ɪɴᴀᴛᴀ:* ${ficha.extras.condicao}
*ᴀᴩᴀʀêɴᴄɪᴀ (2D/3D):* ${ficha.info.aparencia}
*ɴíᴠᴇʟ/ʀᴀɴᴋɪɴɢ:* ${ficha.nivel < 10 ? "0"+ficha.nivel : ficha.nivel}/${ficha.rank}
*xᴩ:* ${ficha.xp}/${ficha.nivel * 100}

*《ᴇʟᴇᴍᴇɴᴛᴏꜱ ᴍáɢɪᴄᴏꜱ》*
${listarSlots(ficha.extras.elementos_lista, [10, 20, 30])}
*《ꜰᴜꜱõᴇꜱ ᴇʟᴇᴍᴇɴᴛᴀɪꜱ》*
— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.20)
— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.40)
— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.60)
— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.70)

*《ʜᴀʙɪʟɪᴅᴀᴅᴇꜱ ᴇxᴛʀᴀꜱ》*
${listarSlots(ficha.extras.habilidades_lista, [5, 10])}
*《ᴩᴏɴᴛᴏꜱ ᴅᴇ ᴀᴛʀɪʙᴜᴛᴏꜱ (Totais)》*
*— ꜰᴏʀçᴀ:* [${Math.floor(ficha.atributos_totais.forca)}]
*— ᴠᴇʟᴏᴄɪᴅᴀᴅᴇ:* [${Math.floor(ficha.atributos_totais.velocidade)}]
*— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ꜰíꜱɪᴄᴀ:* [${Math.floor(ficha.atributos_totais.resistencia)}]
*— ᴩᴏᴅᴇʀ ᴍáɢɪᴄᴏ:* [${Math.floor(ficha.atributos_totais.poder_magico)}]
*— ᴄᴏɴᴛʀᴏʟᴇ ᴍáɢɪᴄᴏ:* [${Math.floor(ficha.atributos_totais.controle_magico)}]
*— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ᴍáɢɪᴄᴀ:* [${Math.floor(ficha.atributos_totais.resistencia_magica)}]
*— ᴩʀᴇᴄɪꜱãᴏ:* [${Math.floor(ficha.atributos_totais.precisao)}]
*— ʜ.ᴩ.:* [${Math.floor(ficha.status.hp_atual)}/${Math.floor(ficha.status.hp_max)}]
*— ᴍ.ᴩ.:* [${Math.floor(ficha.status.mp_atual)}/${Math.floor(ficha.status.mp_max)}]

*💎 ᴩᴏɴᴛᴏꜱ ʟɪᴠʀᴇꜱ:* ${ficha.pontos_livres}

      《ʟɪꜱᴛᴀ ᴅᴇ ɪᴛᴇɴꜱ》

${listarItens()}`;
}

function gerarTextoCombate(ficha) {
    let recargas = "✅ Habilidades Prontas";
    let cds = Object.entries(ficha.combate.cooldowns).filter(([k,v]) => v > 0);
    if (cds.length > 0) recargas = cds.map(([k,v]) => `${k} (${v}t)`).join(", ");

    let buffs = "---";
    let bffs = Object.entries(ficha.combate.duracoes).filter(([k,v]) => v > 0);
    if (bffs.length > 0) buffs = bffs.map(([k,v]) => `${k} (${v}t)`).join(", ");

    let skillsAtivas = [...ficha.extras.habilidades_lista, ...ficha.tecnicas].join(", ");
    let danoFisico = Math.floor(ficha.atributos_totais.forca * 20);
    let defesaFisica = Math.floor(ficha.atributos_totais.resistencia * 20);
    let danoMagico = Math.floor(ficha.atributos_totais.poder_magico * 20);
    let velMs = Math.floor(ficha.atributos_totais.velocidade * 0.5);

    return `📜 *FICHA TÉCNICA: ${ficha.nome.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
👤 Nível: ${ficha.nivel} (Rank ${ficha.rank})
✨ XP: ${ficha.xp} / ${ficha.nivel * 100}
💎 Pontos Livres: ${ficha.pontos_livres}
━━━━━━━━━━━━━━━━━━━━
❤ HP: ${Math.floor(ficha.status.hp_atual)} / ${Math.floor(ficha.status.hp_max)}
💙 MP: ${Math.floor(ficha.status.mp_atual)} / ${Math.floor(ficha.status.mp_max)}
━━━━━━━━━━━━━━━━━━━━
📊 *ATRIBUTOS*
💪 Força: ${Math.floor(ficha.atributos_totais.forca)} (Dano: ${danoFisico})
🏃 Velocidade: ${Math.floor(ficha.atributos_totais.velocidade)} (${velMs} m/s)
🛡 Res. Física: ${Math.floor(ficha.atributos_totais.resistencia)} (Defesa: ${defesaFisica})
✨ Poder Mágico: ${Math.floor(ficha.atributos_totais.poder_magico)} (Dano: ${danoMagico})
🌀 Controle Mágico: ${Math.floor(ficha.atributos_totais.controle_magico)}
🔮 Res. Mágica: ${Math.floor(ficha.atributos_totais.resistencia_magica)}
🎯 Precisão: ${Math.floor(ficha.atributos_totais.precisao)}
━━━━━━━━━━━━━━━━━━━━
🌪 *STATUS ATUAL*
⏳ Recargas: ${recargas}
⚡ Efeitos Ativos:
${buffs}
━━━━━━━━━━━━━━━━━━━━
📚 *TÉCNICAS & HABILIDADES*
${skillsAtivas}`;
}

function calcularXPHistoria(texto) {
    let palavras = texto.split(/\s+/).length;
    let xpBase = 0;
    if (palavras >= 500) xpBase = 1500;
    else if (palavras >= 400) xpBase = 1000;
    else if (palavras >= 300) xpBase = 500;
    else return { xpTotal: 0, msg: "⚠️ Mínimo 300 palavras." };
    let bonusExtras = Math.floor((palavras - (palavras >= 500 ? 500 : (palavras >= 400 ? 400 : 300))) / 25) * 100;
    return { xpTotal: xpBase + bonusExtras, msg: `✍️ **NARRATIVA:** ${palavras} palavras | XP: ${xpBase + bonusExtras}` };
}

module.exports = { 
    processarSave, adicionarXP, uparAtributo, avancarTurnoCompleto, usarHabilidade, 
    adicionarElemento, adicionarExtra, adicionarItem, adicionarSkill, 
    gerarTextoFichaCompleta, gerarTextoCombate, calcularXPHistoria, descansarPersonagem,
    aplicarDano, equiparItem, consumirItem, criarServo, desvincularServo, transferirItem, 
    getServo, saveServo, corrigirEntrada, 
    // Exports novos
    saveNPC, getNPCArquivo, registrarLog, capturarServo, buscarFichaPorNome
};
