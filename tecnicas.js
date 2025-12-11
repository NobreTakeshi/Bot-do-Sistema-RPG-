// ==================================================================================
// ARQUIVO: tecnicas.js (Grimório Detalhado e Seguro)
// ==================================================================================

const TECNICAS = {
    // --- TÉCNICAS DO SISTEMA (Públicas) ---
    "Vórtice de Negação": {
        tipo: "ativo", custo: 0, cd: 4, duracao: 2, publica: true,
        efeito: (f) => {
            f.combate.buffs["imune_magia"] = true; 
            f.combate.buffs["absorver_mp"] = true;
            return `🛡️ **VÓRTICE DE NEGAÇÃO ATIVO!** (2 Turnos)\nPróximo dano mágico será nulificado e 50% virará Mana.`;
        },
        desc: "Item Égide: Nulifica Dano Mágico e absorve Mana."
    },

    "Disparo Parasitário": {
        tipo: "ativo", custo: 0, cd: 0, publica: true,
        efeito: (f) => {
            let custoFlecha = Math.floor(f.status.mp_max * 0.02);
            if (f.status.mp_atual < custoFlecha) return "❌ Mana insuficiente para gerar a flecha.";
            f.status.mp_atual -= custoFlecha;

            let item = f.equipamentos ? Object.values(f.equipamentos).find(i => i && i.skill === "Disparo Parasitário") : null;
            let danoExtra = item ? (item.atributos.dano_magico_fixo || 0) : 0;
            let danoBaseArma = item ? (item.dano_base || 0) : 0;
            let pmPlayer = f.atributos_totais.poder_magico * 20; 
            let danoTotal = danoBaseArma + danoExtra + pmPlayer;
            let mpKill = Math.floor(f.status.mp_max * 0.10);

            return `🏹 **DISPARO PARASITÁRIO (ARCO DAS ALMAS)**\n` + 
                   `💥 **Dano Mágico:** ${danoTotal}\n` +
                   `📉 **Penetração:** Ignora 10% da RM do alvo.\n` +
                   `🩸 **Efeito:** Dano convertido em cura para o servo mais próximo.\n` +
                   `💀 **Passiva (Aljava):** Se matar, recupera +${mpKill} MP.\n` +
                   `⚙️ *Gasto:* ${custoFlecha} MP.`;
        },
        desc: "Item Arco: Dano converte em cura. Ignora RM."
    },

    // --- TÉCNICAS EXCLUSIVAS (Arthur) ---
    // publica: false -> Só quem estiver na lista 'donos' pode adicionar/usar
    "Constructo": {
        tipo: "ativo", custo: 100, cd: 2, duracao: 3,
        publica: false, donos: ["5599999999@c.us"], // Coloque o ID real do Arthur aqui ou deixe vazio para adicionar via comando
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

    "Colheita": { tipo: "passivo", publica: false, desc: "Matar servos/inimigos dá +5% Regen MP." },
    "Transferência": { tipo: "passivo", publica: false, desc: "Dano recebido é transferido para servo a 5m." },

    // --- TÉCNICAS DO YUKINE ---
    "Berço do Monstro": {
        tipo: "ativo", custo: 150, cd: 3, publica: false,
        efeito: (f) => { return `❄️ **BERÇO DO MONSTRO**\n🛡️ Barreira: ${55 + (f.atributos_totais.poder_magico * 20)} Defesa.`; },
        desc: "Cria barreira de água defensiva."
    },
    "Tentáculos": {
        tipo: "ativo", custo: 300, cd: 5, publica: false,
        efeito: (f) => { return `🐙 **MONSTRO DAS PROFUNDEZAS**\n🦑 8 Tentáculos (Alcance 25m).`; },
        desc: "Invoca tentáculos ofensivos."
    },
    "Bênção do Oceano": {
        tipo: "ativo", custo: 500, cd: 6, publica: false,
        efeito: (f) => { return `💧 **BÊNÇÃO DO OCEANO**\n💖 Cura: ${Math.floor((f.atributos_totais.poder_magico * 20) * 0.60)} HP/turno.`; },
        desc: "Cura em área massiva."
    }
};

module.exports = TECNICAS;