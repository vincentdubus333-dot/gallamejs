export class Door {
    constructor(x, y, width, height, targetLevelFile, targetX, targetY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.targetLevelFile = targetLevelFile;
        this.targetX = targetX;  // Position X cible dans le nouveau niveau
        this.targetY = targetY;  // Position Y cible (depuis le sol)
        this.image = image;
        this.isActive = false;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx, camX, camY) {
        const screenX = Math.round(this.x - camX);
        const screenY = Math.round(this.y - camY);

        if (this.image) {
            ctx.drawImage(this.image, screenX, screenY, this.width, this.height);
        } else {
            // Fallback porte marron
            ctx.fillStyle = 'rgb(139, 69, 19)';
            ctx.fillRect(screenX, screenY, this.width, this.height);
            
            ctx.fillStyle = 'rgb(101, 67, 33)';
            ctx.fillRect(screenX + 2, screenY + 2, this.width - 4, this.height - 4);
            
            // Poignée jaune
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(screenX + this.width - 15, screenY + this.height / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawInteractionPrompt(ctx, camX, camY) {
        const screenX = Math.round(this.x + this.width / 2 - camX);
        const screenY = Math.round(this.y - 20 - camY);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("[E]", screenX, screenY);
    }
}