import { GameConfig } from '../GameConfig.js';

// Définition des types de blocs
export const BlockType = {
    NORMAL: 'NORMAL',
    DEADLY: 'DEADLY',
    FINISH: 'FINISH',
    COLORED: 'COLORED',
    TEXTURED: 'TEXTURED'
};

export class Block {
    /**
     * @param {number} x Position X monde
     * @param {number} y Position Y monde
     * @param {number} width Largeur
     * @param {number} height Hauteur
     * @param {string} type Type (BlockType)
     * @param {string} customColor Couleur hex (ex: "#FF0000") ou null
     * @param {string} textureKey Nom de la texture ou null
     */
    constructor(x, y, width, height, type = BlockType.NORMAL, customColor = null, textureKey = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.customColor = customColor;
        this.textureKey = textureKey;
        
        // Stockera l'objet Image() une fois chargé (géré par LevelLoader ou ici)
        this.texture = null; 
    }

    /**
     * Définit l'image texture du bloc
     */
    setTexture(img) {
        this.texture = img;
    }

    /**
     * Méthode principale de dessin
     */
    draw(ctx, camX, camY) {
        // 1. Calcul de la position à l'écran (Arrondi pour éviter le flou)
        const screenX = Math.round(this.x - camX);
        const screenY = Math.round(this.y - camY);

        // 2. Optimisation (Culling) : Ne rien dessiner si hors de l'écran
        // On ajoute une marge de sécurité
        if (screenX + this.width < -100 || screenX > GameConfig.CANVAS_WIDTH + 100 ||
            screenY + this.height < -100 || screenY > GameConfig.CANVAS_HEIGHT + 100) {
            return;
        }

        // 3. Choix du rendu selon la priorité

        // CAS A : Texture chargée (Image)
        if (this.texture) {
            try {
                ctx.drawImage(this.texture, screenX, screenY, this.width, this.height);
            } catch (e) {
                // Si l'image bug, on dessine un carré rose (debug)
                ctx.fillStyle = '#FF00FF';
                ctx.fillRect(screenX, screenY, this.width, this.height);
            }
            return;
        }

        // CAS B : Couleur personnalisée
        // C'est ici que tes blocs blancs (#ffffff) vont être gérés
        if (this.type === BlockType.COLORED && this.customColor) {
            this.drawColoredBlock(ctx, screenX, screenY, this.customColor);
            return;
        }

        // CAS C : Styles par défaut selon le type
        switch (this.type) {
            case BlockType.DEADLY:
                this.drawSpikes(ctx, screenX, screenY);
                break;
            case BlockType.FINISH:
                this.drawFinish(ctx, screenX, screenY);
                break;
            case BlockType.NORMAL:
            default:
                this.drawBrick(ctx, screenX, screenY);
                break;
        }
    }

    // --- Styles de Secours (Fallbacks) ---

    drawBrick(ctx, x, y) {
        // Fond Marron
        ctx.fillStyle = '#8B4513'; 
        ctx.fillRect(x, y, this.width, this.height);
        
        // Effet 3D (Bords clairs et foncés)
        ctx.lineWidth = 2;
        
        // Bord Haut/Gauche (Clair)
        ctx.strokeStyle = '#A0522D'; 
        ctx.beginPath();
        ctx.moveTo(x + this.width, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + this.height);
        ctx.stroke();

        // Bord Bas/Droit (Foncé)
        ctx.strokeStyle = '#502005'; 
        ctx.beginPath();
        ctx.moveTo(x + this.width, y);
        ctx.lineTo(x + this.width, y + this.height);
        ctx.lineTo(x, y + this.height);
        ctx.stroke();

        // Contour noir final
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.width, this.height);
    }

    drawColoredBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, this.width, this.height);
        
        // Bordure noire semi-transparente pour bien délimiter le bloc blanc sur fond clair
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.width, this.height);
    }

    drawSpikes(ctx, x, y) {
        // Fond rouge foncé
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(x, y, this.width, this.height);

        // Pics (Triangles)
        ctx.fillStyle = '#DC143C'; // Rouge vif
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        const spikesCount = Math.floor(this.width / 10); // Un pic tous les 10px
        // Sécurité anti-division par zéro
        const count = spikesCount > 0 ? spikesCount : 1; 
        const spikeW = this.width / count;

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const bx = x + (i * spikeW);
            // Triangle
            ctx.moveTo(bx, y + this.height); // Bas gauche
            ctx.lineTo(bx + spikeW / 2, y);  // Pointe haut
            ctx.lineTo(bx + spikeW, y + this.height); // Bas droite
        }
        ctx.fill();
        ctx.stroke();
    }

    drawFinish(ctx, x, y) {
        // Damier
        const size = 10;
        const cols = Math.ceil(this.width / size);
        const rows = Math.ceil(this.height / size);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if ((r + c) % 2 === 0) ctx.fillStyle = 'white';
                else ctx.fillStyle = 'black';
                
                const dx = x + c * size;
                const dy = y + r * size;
                // On s'assure de ne pas dépasser la taille du bloc
                const w = Math.min(size, x + this.width - dx);
                const h = Math.min(size, y + this.height - dy);
                
                ctx.fillRect(dx, dy, w, h);
            }
        }
        ctx.strokeStyle = 'gold';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.width, this.height);
    }
}