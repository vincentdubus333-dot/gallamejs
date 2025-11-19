// js/world/Level.js
import { GameConfig } from '../GameConfig.js';
import { Block, BlockType } from './Block.js';
// Import des entités futures (on les créera après)
// import { Walker } from '../entities/Walker.js'; 

export class Level {
    constructor() {
        // Métadonnées
        this.name = "Niveau Inconnu";
        this.startX = 50;
        this.startY = 0;
        
        // Couleurs par défaut (via GameConfig)
        this.skyColor = GameConfig.COLORS.SKY;
        this.groundColor = GameConfig.COLORS.GROUND;
        
        // Gameplay
        this.glideAllowed = false;
        
        // Listes d'objets
        this.blocks = [];           // Murs et plateformes
        this.backgroundImages = []; // Décor
        this.doors = [];            // Portes
        this.mobData = [];          // Données brutes des mobs (avant spawn)
        this.mobs = [];             // Mobs actifs
        this.npcs = [];             // Personnages non-joueurs
        this.endZones = [];         // Zones de fin invisibles
    }

    // === GESTION DES DONNÉES ===

    addBlock(block) {
        this.blocks.push(block);
    }

    addBackgroundImage(bgImage) {
        this.backgroundImages.push(bgImage);
    }

    // Similaire à ta méthode Java addEndZone
    addEndZone(rect, targetLevelIndex) {
        this.endZones.push({ rect, targetLevelIndex });
        // Note : Le bloc visuel "FINISH" est déjà ajouté par le LevelLoader dans this.blocks
    }

    addDoor(door) {
        this.doors.push(door);
    }

    addMobData(type, x, y_sol, speed) {
        this.mobData.push({ type, x, y_sol, speed });
    }
    
    addNPC(npc) {
        this.npcs.push(npc);
    }

    // === INSTANCIATION DES MOBS (Comme en Java) ===
    instantiateMobs() {
        this.mobs = [];
        console.log(`Instanciation de ${this.mobData.length} mobs...`);
        
        this.mobData.forEach(data => {
            // Calcul Y absolu (Ground - Hauteur sol - Hauteur Mob)
            // On assume 32px de haut par défaut
            const y_absolu = GameConfig.GROUND_Y - data.y_sol - 32; 
            
            if (data.type === 'WALKER' || data.type === 'MOB_WALKER') {
                // TODO: Décommenter quand la classe Walker sera faite
                // this.mobs.push(new Walker(data.x, y_absolu, data.speed));
                // En attendant, on log
                // console.log("Walker créé à", data.x, y_absolu);
            }
        });
    }

    // === RENDU GRAPHIQUE GLOBAL DU NIVEAU ===
    // Remplace une partie de ton Renderer.java
    draw(ctx, camX, camY) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // 1. Ciel (Fond uni)
        ctx.fillStyle = this.skyColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Images de fond (Montagnes, maisons...)
        // On calcule où est le sol à l'écran pour caler les images
        const groundScreenY = Math.round(GameConfig.GROUND_Y - camY);
        
        this.backgroundImages.forEach(img => {
            img.draw(ctx, camX, camY, groundScreenY);
        });

        // 3. Sol (La terre verte en bas)
        // On dessine un grand rectangle à partir de la ligne de sol
        if (groundScreenY < height) {
            ctx.fillStyle = this.groundColor;
            ctx.fillRect(0, groundScreenY, width, height - groundScreenY);
            
            // Petite bordure foncée pour le style (comme en Java)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, groundScreenY, width, 6);
        }

        // 4. Portes (Derrière les blocs)
        // TODO: this.doors.forEach(d => d.draw(ctx, camX, camY));

        // 5. Blocs (Plateformes)
        this.blocks.forEach(block => block.draw(ctx, camX, camY));

        // 6. Mobs & NPCs (Devant les blocs)
        // this.mobs.forEach(m => m.draw(ctx, camX, camY));
        // this.npcs.forEach(n => n.draw(ctx, camX, camY));
    }
}