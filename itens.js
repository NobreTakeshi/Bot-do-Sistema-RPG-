// ==================================================================================
// ARQUIVO: itens.js (Banco de Dados de Equipamentos)
// ==================================================================================

const ITENS = {
    "A Égide do Vazio": {
        tipo: "Escudo",
        slot: "mao_esquerda", 
        raridade: "Raro",
        donoOriginal: '559984242052@c.us', // ID do Arthur
        atributos: { resistencia: 30, resistencia_magica: 30, poder_magico: 22 },
        
        // VÍNCULO: Este nome deve ser igual ao do tecnicas.js
        skill: "Vórtice de Negação", 
        
        desc: "Escudo com névoa roxa. Passiva: Aura do General Morto."
    },

    "O Arco das Almas Perdidas": {
        tipo: "Arma",
        slot: "ambas",
        raridade: "Raro",
        donoOriginal: '559984242052@c.us', // ID do Arthur
        dano_base: 40,
        atributos: { precisao: 30, dano_magico_fixo: 440 },
        
        // VÍNCULO: Este nome deve ser igual ao do tecnicas.js
        skill: "Disparo Parasitário",
        
        desc: "Dispara energia necrótica."
    },

    "Katana de Gelo": {
        tipo: "Arma",
        slot: "mao_direita",
        raridade: "Raro",
        donoOriginal: '', // Se deixar vazio, qualquer um pode pegar!
        dano_base: 50,
        atributos: { forca: 20, velocidade: 10 },
        desc: "Lâmina congelante criada por Baal."
    },

    // --- ITENS COMUNS (LOJA/DROPS) ---
    // Deixe donoOriginal vazio ou nem coloque a linha para serem públicos.
    
    "Espada de Ferro": {
        tipo: "Arma",
        slot: "mao_direita",
        raridade: "Comum",
        atributos: { forca: 5 },
        desc: "Uma espada simples de aventureiro."
    },

    "Poção de Cura": { 
        tipo: "Consumível", 
        raridade: "Comum", 
        desc: "Recupera 20% HP." 
    },

    "Poção de Mana": { 
        tipo: "Consumível", 
        raridade: "Comum", 
        desc: "Recupera 20% MP." 
    },

    "Banquete": { 
        tipo: "Consumível", 
        raridade: "Incomum", 
        desc: "Recupera HP/MP e sacia fome." 
    }
};

module.exports = ITENS;
