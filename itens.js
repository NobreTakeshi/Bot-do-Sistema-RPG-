// ==================================================================================
// ARQUIVO: itens.js
// ==================================================================================

const ITENS = {
    // --- ITENS ÚNICOS (COM DONO REGISTRADO) ---
    
    "A Égide do Vazio": {
        tipo: "Escudo",
        slot: "mao_esquerda", 
        raridade: "Raro",
        // ID do Player criador (Arthur). Só ele pode usar !additem neste item.
        donoOriginal: "5599999999@c.us", 
        atributos: { resistencia: 30, resistencia_magica: 30, poder_magico: 22 },
        skill: "Vórtice de Negação",
        desc: "Escudo com névoa roxa. Passiva: Aura do General Morto."
    },

    "O Arco das Almas Perdidas": {
        tipo: "Arma",
        slot: "ambas",
        raridade: "Raro",
        donoOriginal: "5599999999@c.us", // ID do Arthur
        dano_base: 40,
        atributos: { precisao: 30, dano_magico_fixo: 440 },
        skill: "Disparo Parasitário",
        desc: "Dispara energia necrótica."
    },

    // --- ITENS DE OUTROS PLAYERS (EXEMPLO) ---
    "Katana de Gelo": {
        tipo: "Arma",
        slot: "mao_direita",
        raridade: "Raro",
        donoOriginal: "5588888888@c.us", // ID do Baal (Exemplo)
        dano_base: 50,
        atributos: { forca: 20, velocidade: 10 },
        desc: "Lâmina congelante criada por Baal."
    },

    // --- ITENS COMUNS (SEM DONO - QUALQUER UM PODE ADICIONAR) ---
    
    "Poção de Cura": { tipo: "Consumível", raridade: "Comum", desc: "Recupera 20% HP." },
    "Poção de Mana": { tipo: "Consumível", raridade: "Comum", desc: "Recupera 20% MP." },
    "Banquete": { tipo: "Consumível", raridade: "Incomum", desc: "Recupera HP/MP e sacia fome." }
};

module.exports = ITENS;