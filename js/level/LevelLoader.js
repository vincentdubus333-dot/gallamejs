import { GameConfig } from '../GameConfig.js';
import { Block, BlockType } from '../world/Block.js';
import { Level } from '../world/Level.js';
import { BackgroundImage } from '../world/BackgroundImage.js';
import { Door } from '../entities/Door.js';
import { Walker } from '../entities/Walker.js';
import { NPC } from '../entities/NPC.js';

export class LevelLoader {

    async load(filename) {
        // 1. Nettoyage du chemin (Java -> JS)
        // On enlève le package Java pour pointer vers le dossier assets
        let cleanPath = filename.replace('/fr/gallame/resources/', 'assets/');

        // Sécurité : si le chemin commence déjà par assets, on ne touche pas
        if (!cleanPath.startsWith('assets/')) {
            if (cleanPath.startsWith('/')) cleanPath = 'assets' + cleanPath;
            else cleanPath = 'assets/' + cleanPath;
        }

        console.log(`Chargement: ${cleanPath}`);

        try {
            const response = await fetch(cleanPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            return this.parseLevel(text);
        } catch (e) {
            console.error("Erreur chargement niveau:", e);
            return null;
        }
    }

    parseLevel(text) {
        const level = new Level();
        const lines = text.split('\n');
        const groundY = GameConfig.GROUND_Y;

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            const parts = line.split(',').map(s => s.trim());
            const type = parts[0].toLowerCase();

            // Gestion des cas spéciaux comme "mob_walker"
            if (type.startsWith('mob_')) {
                this.parseMob(level, type.substring(4), parts, groundY);
                return;
            }

            switch (type) {
                case 'name': level.name = parts[1]; break;
                case 'sky': level.skyColor = parts[1]; break;
                case 'ground': level.groundColor = parts[1]; break;
                case 'glide': level.glideAllowed = (parts[1] === 'true'); break;

                case 'start':
                    level.startX = parseFloat(parts[1]);
                    // Attention au calcul Y du joueur
                    level.startY = groundY - parseFloat(parts[2]) - GameConfig.PLAYER_SIZE;
                    break;

                case 'image':
                case 'background':
                    this.parseBackgroundImage(level, parts, groundY);
                    break;

                case 'bloc':
                case 'block':
                    this.parseBlock(level, parts, groundY);
                    break;

                case 'porte':
                    this.parseDoor(level, parts, groundY);
                    break;

                case 'fin':
                    this.parseEndZone(level, parts, groundY);
                    break;
                case 'npc':
                    // On récupère tout après le 5ème élément pour le message (au cas où il y a des virgules)
                    // Format: npc, x, y_sol, w, h, imagePath, message...
                    const npcX = parseInt(parts[1]);
                    const npcY_sol = parseInt(parts[2]);
                    const npcW = parseInt(parts[3]);
                    const npcH = parseInt(parts[4]);
                    const npcImg = parts[5];

                    // Astuce pour récupérer tout le message même s'il contient des virgules
                    // On rejoint tous les morceaux à partir de l'index 6
                    const message = parts.slice(6).join(',');

                    const npcY_abs = groundY - npcY_sol - npcH;

                    // Il faut importer NPC en haut du fichier !
                    // Importe aussi une image pour le sprite
                    const imgObj = new Image();
                    imgObj.src = npcImg;

                    level.addNPC(new NPC(npcX, npcY_abs, npcW, npcH, imgObj, message));
                    break;
            }
        });

        return level;
    }

    // --- PARSEURS DÉTAILLÉS ---

    parseBackgroundImage(level, parts, groundY) {
        // image, path, x, y, w, h
        let path = parts[1].replace('/fr/gallame/resources/', 'assets/');
        const x = parseInt(parts[2]);
        const y = parseInt(parts[3]);
        const w = parseInt(parts[4]);
        const h = parseInt(parts[5]);

        // On charge l'image de manière asynchrone
        const img = new Image();
        img.src = path;

        // On calcule le Y monde (en Java c'était inversé ou depuis le sol ?)
        // Dans ton fichier niveau8, les images ont des Y comme 260 ou 20.
        // Supposons que c'est "depuis le sol" comme le reste.
        const worldY = groundY - y - h;

        level.addBackgroundImage(new BackgroundImage(img, x, worldY, w, h));
    }

    parseBlock(level, parts, groundY) {
        const x = parseInt(parts[1]);
        const y_sol = parseInt(parts[2]);
        const w = parseInt(parts[3]);
        const h = parseInt(parts[4]);
        const y_absolu = groundY - y_sol - h;

        let type = BlockType.NORMAL;
        let color = null;

        if (parts.length > 5) {
            const extra = parts[5];
            if (extra.startsWith('#')) {
                type = BlockType.COLORED;
                color = extra;
            } else if (['DEADLY', 'FINISH'].includes(extra.toUpperCase())) {
                type = extra.toUpperCase();
            }
        }

        level.addBlock(new Block(x, y_absolu, w, h, type, color));
    }

    parseDoor(level, parts, groundY) {
        // porte, x, y, w, h, targetFile, targetX, targetY, image
        const x = parseInt(parts[1]);
        const y_sol = parseInt(parts[2]);
        const w = parseInt(parts[3]);
        const h = parseInt(parts[4]);
        const y_absolu = groundY - y_sol - h;

        const targetFile = parts[5];
        // Optionnel : coordonnées cible
        let targetX = parts.length > 6 ? parseFloat(parts[6]) : null;
        let targetY = parts.length > 7 ? parseFloat(parts[7]) : null;

        level.addDoor(new Door(x, y_absolu, w, h, targetFile, targetX, targetY, null));
    }

parseEndZone(level, parts, groundY) {
    const x = parseInt(parts[1]);
    const y_sol = parseInt(parts[2]);
    const w = parseInt(parts[3]);
    const h = parseInt(parts[4]);
    const y_absolu = groundY - y_sol - h;

    // 1. Ajouter le bloc VISUEL (le damier)
    level.addBlock(new Block(x, y_absolu, w, h, BlockType.FINISH));

    // 2. Ajouter la zone LOGIQUE (pour la détection de victoire)
    // On récupère le fichier cible (ex: assets/niveau2.txt) s'il est précisé, sinon null
    const targetLevel = parts.length > 5 ? parts[5] : null;
    
    // On crée un petit rectangle logique
    // (Rectangle est un objet simple {x, y, width, height})
    const rect = { x: x, y: y_absolu, width: w, height: h };
    
    level.addEndZone(rect, targetLevel);
}

    parseMob(level, type, parts, groundY) {
        // mob_walker, x, y_sol, speed
        const x = parseInt(parts[1]);
        const y_sol = parseInt(parts[2]);
        const speed = parseFloat(parts[3]);
        const y_absolu = groundY - y_sol - 32; // 32 = hauteur standard mob

        if (type === 'walker') {
            level.mobs.push(new Walker(x, y_absolu, speed));
        }
    }
}