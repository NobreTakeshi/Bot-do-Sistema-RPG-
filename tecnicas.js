// ==================================================================================
// ARQUIVO: tecnicas.js (Grimório Detalhado e Seguro V8)
// ==================================================================================

const TECNICAS = {
    // --- HABILIDADES DE ITENS LENDÁRIOS ---
    
    "Vórtice de Negação": {
        tipo: "ativo",
        custo: 50, // Custo de ativação (se quiser 0, mude aqui)
        cd: 4,     // Cooldown de 4 turnos
        duracao: 2, // Dura 2 turnos ativo
        publica: true, // É pública pois o acesso depende do ITEM, não da lista de donos
        efeito: (f) => {
            // Ativa as flags que o sistema.js lê na função aplicarDano
            f.combate.buffs["imune_magia"] = true; 
            f.combate.buffs["absorver_mp"] = true;
            return `🛡️ **VÓRTICE DE NEGAÇÃO ATIVO!** (2 Turnos)\nUma névoa roxa te envolve. Próximo dano mágico será anulado e 50% virará Mana.`;
        },
        desc: "Item Égide: Nulifica Dano Mágico e absorve Mana."
    },

    "Disparo Parasitário": {
        tipo: "ativo",
        custo: 0, // Geralmente gasta a mana do arco ou é de graça
        cd: 0,
        publica: true,
        efeito: (f) => {
            // 1. Custo Especial (2% da Mana Máxima)
            let custo = Math.floor(f.status.mp_max * 0.02);
            if (f.status.mp_atual < custo) return "❌ Mana insuficiente para canalizar o disparo.";
            f.status.mp_atual -= custo;

            // 2. Busca o Item Equipado para pegar os Bônus dele
            // Procura na mão direita, esquerda ou ambas
            let item = null;
            if (f.equipamentos.mao_direita && f.equipamentos.mao_direita.skill === "Disparo Parasitário") item = f.equipamentos.mao_direita;
            else if (f.equipamentos.mao_esquerda && f.equipamentos.mao_esquerda.skill === "Disparo Parasitário") item = f.equipamentos.mao_esquerda;

            // Valores Base
            let danoBaseItem = item ? (item.dano_base || 0) : 0; // Ex: 40
            let danoFixoItem = item && item.atributos ? (item.atributos.dano_magico_fixo || 0) : 0; // Ex: 440
            let pmPlayer = f.atributos_totais.poder_magico * 20; // Dano do Player

            // Dano Final
            let danoTotal = danoBaseItem + danoFixoItem + pmPlayer;
            let mpRegen = Math.floor(f.status.mp_max * 0.10); // Se matar recupera 10% (Texto narrativo)

            return `🏹 **DISPARO PARASITÁRIO**\n` +
                   `💥 **Dano Mágico Total:** ${danoTotal}\n` +
                   `_(Base ${danoBaseItem} + Extra ${danoFixoItem} + PM ${pmPlayer})_\n` +
                   `🩸 **Efeito:** O dano causado é convertido em cura para o servo mais próximo.\n` +
                   `💀 **Ceifador:** Se matar o alvo, recupera +${mpRegen} MP.`;
        },
        desc: "Item Arco: Dano massivo que cura servos."
    },

    // --- TÉCNICAS EXCLUSIVAS (Arthur) ---
    // Nota: 'donos' deve conter IDs entre aspas, ex: ['551199999999@c.us']
    
    "Constructo": {
        tipo: "ativo", custo: 100, cd: 2, duracao: 3,
        publica: false, donos: [], 
        efeito: (f) => {
            let pm = f.atributos_totais.poder_magico;
            let cm = f.atributos_totais.controle_magico;
            
            let forca = Math.floor(pm * 1.5);
            let res = Math.floor(pm * 1.5);
            let vel = Math.floor(cm * 1.5);
            let hp = Math.floor((pm * 20) * 0.15); // 15% do Dano Mágico Base

            return `🤖 **CONSTRUCTO DE ÉTER SOMBRIO** (Nvl 2)
━━━━━━━━━━━━━━━━━━━━
❤ **HP:** ${hp}
🛡️ **Resistência:** ${res}
💨 **Velocidade:** ${vel}
💪 **Força:** ${forca} (Dano Físico: ${forca*20})
━━━━━━━━━━━━━━━━━━━━
🔗 *Efeitos:*
1. **Condução Arcana:** Pode conjurar magias a partir do constructo.
2. **Retorno do Vazio:** Desfazer recupera 25MP e transfere memórias.`;
        },
        desc: "Cria servo de pura magia (PM x1.5). Sem alma."
    },

    "Legião Oculta": {
        tipo: "ativo", custo: 200, cd: 5, duracao: 4,
        publica: false, donos: [],
        efeito: (f) => {
            let capacidade = f.nivel * 2; 
            return `👥 **DOMÍNIO DAS SOMBRAS: LEGIÃO OCULTA** (Nvl 4)
━━━━━━━━━━━━━━━━━━━━
📦 **Arquivo de Estase:** Capacidade de ${capacidade} servos.
💤 **Regen na Sombra:** Servos recuperam 10% HP/MP por cena.
⚔️ **Emboscada:** Invocação instantânea (Ação Bônus).
💀 **Abraço do Túmulo:** Guarda cadáveres a até 10m.
🔄 **Transposição:** Troca de lugar com servo (Velocidade: ${f.atributos_totais.controle_magico}).`;
        },
        desc: "Guarda exército na sombra e permite teleporte."
    },

    "Miasma": {
        tipo: "ativo", custo: 300, cd: 7, duracao: 6,
        publica: false, donos: [],
        efeito: (f) => {
            let danoVerdadeiro = Math.floor(150 * 0.15);
            return `☠️ **MIASMA DA DESOLAÇÃO (ULTIMATE)** (Nvl 5)
━━━━━━━━━━━━━━━━━━━━
🌫️ **Aura:** 30m de raio (Move-se com o servo).
😵 **Vertigem:** -30% Vel. Ataque, Controle e Precisão nos inimigos.
🕳️ **Poço de Piche:** Lentidão -50% (Chance 16% de prender).
🩸 **Dreno Vital:** Inimigos sofrem ${danoVerdadeiro} dano verdadeiro/turno. Servo cura 50% disso.
🛡️ **Corrosão:** Inimigos perdem -20% Defesa (RF/RM).`;
        },
        desc: "Nuvem tóxica que debuffa inimigos e cura o servo."
    },

    "Colheita": { 
        tipo: "passivo", publica: false, donos: [],
        desc: "Matar servos/inimigos dá +5% Regen MP." 
    },
    
    "Transferência": { 
        tipo: "passivo", publica: false, donos: [],
        desc: "Dano recebido é transferido para servo a 5m." 
    },

    // --- TÉCNICAS DO YUKINE ---
    "Berço do Monstro": {
        tipo: "ativo", custo: 150, cd: 3, publica: false, donos: [],
        efeito: (f) => { return `❄️ **BERÇO DO MONSTRO**\n🛡️ Barreira: ${55 + (f.atributos_totais.poder_magico * 20)} Defesa.`; },
        desc: "Cria barreira de água defensiva."
    },
    "Tentáculos": {
        tipo: "ativo", custo: 300, cd: 5, publica: false, donos: [],
        efeito: (f) => { return `🐙 **MONSTRO DAS PROFUNDEZAS**\n🦑 8 Tentáculos (Alcance 25m).`; },
        desc: "Invoca tentáculos ofensivos."
    },
    "Bênção do Oceano": {
        tipo: "ativo", custo: 500, cd: 6, publica: false, donos: [],
        efeito: (f) => { return `💧 **BÊNÇÃO DO OCEANO**\n💖 Cura: ${Math.floor((f.atributos_totais.poder_magico * 20) * 0.60)} HP/turno.`; },
        desc: "Cura em área massiva."
    }
};

module.exports = TECNICAS;
