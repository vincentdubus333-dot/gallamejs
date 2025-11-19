// js/world/BackgroundImage.js

export class BackgroundImage {
    constructor(image, worldX, worldY, width, height) {
        this.image = image; // Objet Image() JS
        this.worldX = worldX;
        this.worldY = worldY;
        this.width = width;
        this.height = height;
    }

    draw(ctx, camX, camY, groundScreenY) {
        if (!this.image) return;

        // Parallaxe simple : on soustrait la caméra
        const x = Math.round(this.worldX - camX);
        const y = Math.round(this.worldY - camY);

        // 1. Dessiner l'image
        ctx.drawImage(this.image, x, y, this.width, this.height);

        // 2. (Optionnel) Le dégradé vers le sol comme dans ton Renderer.java
        // Pour l'instant, on fait simple, on pourra ajouter le dégradé plus tard
        // si tu veux l'effet visuel exact du Java.
    }
}