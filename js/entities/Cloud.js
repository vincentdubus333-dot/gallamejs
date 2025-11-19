export class Cloud {
    constructor(x, y, w, h, speed) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.speed = speed;
    }

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        // Dessin des 3 ovales (adaptation de ton code Java)
        this.fillOval(ctx, sx, sy, this.w, this.h);
        this.fillOval(ctx, sx - this.w * 0.3, sy + this.h * 0.1, this.w * 0.7, this.h * 0.7);
        this.fillOval(ctx, sx + this.w * 0.5, sy + this.h * 0.05, this.w * 0.6, this.h * 0.6);
    }

    // Helper car fillOval n'existe pas nativement en Canvas
    fillOval(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, 2 * Math.PI);
        ctx.fill();
    }
}