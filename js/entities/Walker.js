// js/entities/Walker.js
export class Walker {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.speed = speed || 1;
        this.isAlive = true;
        this.direction = 1; // 1 = droite, -1 = gauche
    }

    update(dt, blocks) {
        if (!this.isAlive) return;
        
        // Mouvement simple
        this.x += this.speed * this.direction;

        // TODO: Ajouter ici la détection de collision pour faire demi-tour
        // Pour l'instant, il fait juste des aller-retours sur une distance fixe (simulation)
        // Dans la version finale, il faudra checkCollision(this.x + speed, this.y)
    }

    draw(ctx, camX, camY) {
        if (!this.isAlive) return;
        
        const sx = Math.round(this.x - camX);
        const sy = Math.round(this.y - camY);

        ctx.fillStyle = 'red';
        ctx.fillRect(sx, sy, this.width, this.height);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, this.width, this.height);
        
        // Yeux pour voir la direction
        ctx.fillStyle = 'white';
        if (this.direction > 0) {
            ctx.fillRect(sx + 20, sy + 5, 8, 8);
        } else {
            ctx.fillRect(sx + 4, sy + 5, 8, 8);
        }
    }
}