export class NPC {
    constructor(x, y, w, h, image, message) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.image = image;
        this.message = message;
        this.showingMessage = false;
    }

    isPlayerNear(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx*dx + dy*dy) < 80; // Range arbitraire de 80px
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;

        if (this.image) {
            ctx.drawImage(this.image, sx, sy, this.width, this.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(sx, sy, this.width, this.height);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(sx, sy, this.width, this.height);
        }
    }

    drawInteractionPrompt(ctx, camX, camY) {
        const sx = this.x + this.width/2 - camX;
        const sy = this.y - 30 - camY;

        // Fond noir semi-transparent
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.roundRect(ctx, sx - 15, sy, 30, 30, 5);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("E", sx, sy + 15);
    }

    drawMessage(ctx, camX, camY) {
        if (!this.message) return;
        
        const sx = this.x - camX + this.width/2;
        const sy = this.y - camY - 20;
        const bubbleW = 250;
        
        // Wrapping du texte
        const lines = this.wrapText(ctx, this.message, bubbleW - 20);
        const lineHeight = 20;
        const bubbleH = (lines.length * lineHeight) + 20;

        // Dessin de la bulle
        const bx = sx - bubbleW/2;
        const by = sy - bubbleH;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        this.roundRect(ctx, bx, by, bubbleW, bubbleH, 10);
        ctx.fill();
        ctx.stroke();

        // Texte
        ctx.fillStyle = 'black';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        lines.forEach((line, i) => {
            ctx.fillText(line, bx + 10, by + 10 + (i * lineHeight));
        });
        
        // Triangle (queue de la bulle)
        ctx.beginPath();
        ctx.moveTo(sx - 10, by + bubbleH);
        ctx.lineTo(sx + 10, by + bubbleH);
        ctx.lineTo(sx, by + bubbleH + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Utilitaire pour dessiner rectangle arrondi
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Algorithme de découpe de texte
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            let width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }
}