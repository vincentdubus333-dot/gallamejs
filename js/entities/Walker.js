import { GameConfig } from '../GameConfig.js';
import { BlockType } from '../world/Block.js'; // Import nécessaire pour éviter les bugs si tu utilises BlockType

export class Walker {
    constructor(x, y, speed) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.speed = speed || 2;
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.isAlive = true;
        this.direction = 0;
        this.vy = 0;
        this.onGround = false;
        this.isActive = false;
        this.jumpForce = -12;
        this.detectionRange = 300;
    }

    update(dt, blocks, player, canAggro = true) {
        if (!this.isAlive) return;

        // 1. --- IA & DÉTECTION ---
        if (player) {
            const dx = player.x - this.x;
            const dist = Math.abs(dx);

            if (dist < this.detectionRange && canAggro) {
                this.isActive = true;
                this.direction = (dx > 0) ? 1 : -1;

                // SAUT : Si le joueur saute OU si je suis bloqué contre un mur (optionnel mais sympa)
                if (player.jumping && this.onGround) {
                    this.vy = this.jumpForce;
                    this.onGround = false;
                }
            } else {
                this.isActive = false;
                this.direction = 0;
            }

            this.checkPlayerCollision(player);
        }

        // 2. --- MOUVEMENT HORIZONTAL (X) ---
        if (this.isActive) {
            this.x += this.speed * this.direction;
        }

        // 3. --- COLLISIONS MURS (X) ---
        // On vérifie les collisions tout de suite après le mouvement X
        for (const block of blocks) {
            if (this.intersects(block)) {
                // On annule le mouvement horizontal pour "bloquer" contre le mur
                if (this.direction > 0) { // Allait vers la droite
                    this.x = block.x - this.width;
                } else if (this.direction < 0) { // Allait vers la gauche
                    this.x = block.x + block.width;
                }
                
                // Petit bonus IA : Si bloqué par un mur, essayer de sauter ?
                if (this.onGround) {
                     this.vy = this.jumpForce;
                     this.onGround = false;
                }
            }
        }

        // 4. --- PHYSIQUE VERTICALE (Y) ---
        this.vy += GameConfig.GRAVITY;
        this.y += this.vy;
        this.onGround = false; 

        // 5. --- COLLISIONS SOL/PLAFOND (Y) ---
        
        // Limite du monde (bas)
        if (this.y + this.height >= GameConfig.GROUND_Y) {
            this.y = GameConfig.GROUND_Y - this.height;
            this.vy = 0;
            this.onGround = true;
        }

        // Blocs
        for (const block of blocks) {
            if (this.intersects(block)) {
                // Si on tombe sur le bloc (Collision par le haut)
                if (this.vy > 0 && this.y < block.y) { 
                    // Note : le check this.y < block.y assure qu'on était au dessus
                    this.y = block.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
                // Collision par le bas (Tête dans le plafond)
                else if (this.vy < 0 && this.y > block.y) {
                    this.y = block.y + block.height;
                    this.vy = 0;
                }
            }
        }
    }

    checkPlayerCollision(player) {
        if (this.intersects(player)) {
            const playerBottom = player.y + player.height;
            const mobCenterY = this.y + (this.height / 2);
            const isFalling = player.vy > 0;
            const isAbove = playerBottom < mobCenterY + 15; // Marge augmentée

            if (isFalling && isAbove) {
                console.log("Mob écrasé !");
                this.isAlive = false;
                player.vy = -15; // Rebond un peu plus haut
                player.jumping = true; 
                player.onGround = false;
            } else {
                player.die();
            }
        }
    }

    intersects(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    draw(ctx, camX, camY) {
        if (!this.isAlive) return;
        
        const sx = Math.round(this.x - camX);
        const sy = Math.round(this.y - camY);

        ctx.fillStyle = this.onGround ? '#b30000' : '#ff4d4d';
        ctx.fillRect(sx, sy, this.width, this.height);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, this.width, this.height);
        
        if (this.isActive) {
            ctx.fillStyle = 'white';
            if (this.direction > 0) ctx.fillRect(sx + 20, sy + 5, 8, 8);
            else ctx.fillRect(sx + 4, sy + 5, 8, 8);
        } else {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(sx + 10, sy + 8, 4, 4);
            ctx.fillRect(sx + 18, sy + 8, 4, 4);
        }

        ctx.fillStyle = 'black';
        if (this.onGround) ctx.fillRect(sx + 10, sy + 20, 12, 4);
        else ctx.fillRect(sx + 10, sy + 18, 12, 8);
    }
}