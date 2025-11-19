import { GameConfig } from '../GameConfig.js';

export class Camera {
    constructor(viewportWidth, viewportHeight, worldWidth, minY, maxY) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.minY = minY;
        this.maxY = maxY;

        // === CONSTANTES (Tirées de ton Java) ===
        this.DEAD_ZONE_Y = 2.0;
        this.SMOOTHING_FACTOR = 0.15;
        // La caméra ne descendra jamais plus bas que ça (pour voir le ciel)
        this.CAMERA_FLOOR_Y = 100.0; 

        // État initial
        this.x = 0;
        this.y = this.CAMERA_FLOOR_Y;
        this.targetX = 0;
        this.targetY = this.CAMERA_FLOOR_Y;
    }

    update(playerX, playerY, playerSize) {
        // === CALCUL CIBLE HORIZONTALE ===
        // Centrer sur le joueur
        this.targetX = playerX - (this.viewportWidth / 2) + (playerSize / 2);

        // Limites horizontales (Gauche / Droite du monde)
        if (this.targetX < 0) {
            this.targetX = 0;
        }
        if (this.targetX > this.worldWidth - this.viewportWidth) {
            this.targetX = this.worldWidth - this.viewportWidth;
        }

        // === CALCUL CIBLE VERTICALE ===
        // Centrer sur le joueur
        let newTargetY = playerY - (this.viewportHeight / 2) + (playerSize / 2);

        // ZONE MORTE : Si le mouvement est minime, on ne bouge pas (évite le tremblement)
        if (Math.abs(newTargetY - this.targetY) > this.DEAD_ZONE_Y) {
            this.targetY = newTargetY;
        }

        // === APPLIQUER LE PLANCHER ===
        // Empêche la caméra de descendre trop bas (on veut voir le sol en bas de l'écran)
        if (this.targetY > this.CAMERA_FLOOR_Y) {
            this.targetY = this.CAMERA_FLOOR_Y;
        }

        // Limites verticales globales (Haut / Bas du monde)
        if (this.targetY < this.minY) this.targetY = this.minY;
        if (this.targetY > this.maxY) this.targetY = this.maxY;

        // === LISSAGE (LERP) ===
        // On déplace doucement la caméra actuelle (this.x) vers la cible (targetX)
        this.x += (this.targetX - this.x) * this.SMOOTHING_FACTOR;
        this.y += (this.targetY - this.y) * this.SMOOTHING_FACTOR;

        // SNAP : Si on est très proche, on colle exactement pour arrêter les micro-calculs
        if (Math.abs(this.x - this.targetX) < 0.5) this.x = this.targetX;
        if (Math.abs(this.y - this.targetY) < 0.5) this.y = this.targetY;
    }

    // Getters arrondis pour un rendu net (Pixel Perfect)
    get X() { return Math.round(this.x); }
    get Y() { return Math.round(this.y); }
}