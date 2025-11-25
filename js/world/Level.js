// js/world/Level.js
import { GameConfig } from '../GameConfig.js';
import { Block, BlockType } from './Block.js';
// ✅ CORRECTION : On active l'import du Walker
import { Walker } from '../entities/Walker.js'; 

export class Level {
    constructor() {
        // Métadonnées
        this.name = "Niveau Inconnu";
        this.startX = 50;
        this.startY = 0;
        
        // Couleurs par défaut
        this.skyColor = GameConfig.COLORS.SKY;
        this.groundColor = GameConfig.COLORS.GROUND;
        
        // Gameplay
        this.glideAllowed = false;
        
        // Listes d'objets
        this.blocks = [];           
        this.backgroundImages = []; 
        this.doors = [];            
        this.mobData = [];          
        this.mobs = [];             
        this.npcs = [];             
        this.endZones = [];         
    }

    // === GESTION DES DONNÉES ===

    addBlock(block) {
        this.blocks.push(block);
    }

    addBackgroundImage(bgImage) {
        this.backgroundImages.push(bgImage);
    }

    addEndZone(rect, targetLevelIndex) {
        this.endZones.push({ rect, targetLevelIndex });
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

    // === INSTANCIATION DES MOBS ===
    instantiateMobs() {
        // Note : Souvent géré directement par le LevelLoader, 
        // mais utile si on charge les données brutes d'abord.
        if (this.mobData.length > 0 && this.mobs.length === 0) {
            console.log(`Instanciation de ${this.mobData.length} mobs...`);
            this.mobData.forEach(data => {
                const y_absolu = GameConfig.GROUND_Y - data.y_sol - 32; 
                
                if (data.type === 'WALKER' || data.type === 'MOB_WALKER') {
                    // ✅ CORRECTION : Création active du Walker
                    this.mobs.push(new Walker(data.x, y_absolu, data.speed));
                }
            });
        }
    }

    // === RENDU GRAPHIQUE GLOBAL DU NIVEAU ===
    draw(ctx, camX, camY) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // 1. Ciel
        ctx.fillStyle = this.skyColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Images de fond
        const groundScreenY = Math.round(GameConfig.GROUND_Y - camY);
        this.backgroundImages.forEach(img => {
            img.draw(ctx, camX, camY, groundScreenY);
        });

        // 3. Sol
        if (groundScreenY < height) {
            ctx.fillStyle = this.groundColor;
            ctx.fillRect(0, groundScreenY, width, height - groundScreenY);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, groundScreenY, width, 6);
        }

        // 4. Portes
        this.doors.forEach(d => d.draw(ctx, camX, camY));

        // 5. Blocs
        this.blocks.forEach(block => block.draw(ctx, camX, camY));

        // 6. Mobs & NPCs (C'était ici que c'était caché !)
        // ✅ CORRECTION : On dessine les mobs vivants
        this.mobs.forEach(m => {
            if (m.isAlive) m.draw(ctx, camX, camY);
        });

        // ✅ CORRECTION : On dessine les NPCs
        this.npcs.forEach(n => n.draw(ctx, camX, camY));
    }
}