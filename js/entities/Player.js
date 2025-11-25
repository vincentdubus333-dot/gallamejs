import { GameConfig } from '../GameConfig.js';
import { BlockType } from '../world/Block.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GameConfig.PLAYER_SIZE;
        this.height = GameConfig.PLAYER_SIZE;

        // Physique
        this.vx = 0;
        this.vy = 0;

        // États de base
        this.onGround = false;     // <--- CORRECTION : Variable essentielle pour le saut
        this.hasGlideJump = false; // <--- CORRECTION : Initialisation
        this.jumping = false;      
        this.facingRight = true;

        // Wall riding
        this.wallRiding = false;
        this.wallRideLeft = false; 

        // Gliding
        this.gliding = false;
        this.glidingBlock = null;

        // Mouvement forcé
        this.forcedHorizontalVelocity = 0;
        this.forcedMovementFrames = 0;
    }

    update(input, level) {
        // <--- CORRECTION : On part du principe qu'on est en l'air au début de chaque frame
        this.onGround = false; 

        const blocks = level.blocks;
        const groundY = GameConfig.GROUND_Y;

        // === MOUVEMENTS HORIZONTAUX ===
        if (this.forcedMovementFrames > 0) {
            this.x += this.forcedHorizontalVelocity;
            this.forcedMovementFrames--;
        } else {
            if (input.left && !input.right) {
                this.x -= GameConfig.MOVE_SPEED;
                this.facingRight = false;
            }
            if (input.right && !input.left) {
                this.x += GameConfig.MOVE_SPEED;
                this.facingRight = true;
            }
        }

        // Limites du monde
        if (this.x < 0) this.x = 0;
        if (this.x > GameConfig.WORLD_WIDTH - GameConfig.PLAYER_SIZE) {
            this.x = GameConfig.WORLD_WIDTH - GameConfig.PLAYER_SIZE;
        }

        // === GRAVITÉ ET GLIDE ===
        if (this.gliding && this.glidingBlock !== null) {
            this.handleGliding();
        } else {
            this.vy += GameConfig.GRAVITY;
            this.y += this.vy;
        }

        // === COLLISION SOL GLOBAL ===
        if (this.y >= groundY - GameConfig.PLAYER_SIZE) {
            this.y = groundY - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
            this.onGround = true; // <--- CORRECTION : On touche le sol
        }

        // === COLLISIONS BLOCS ===
        this.handleBlockCollisions(blocks);

        // === SAUT ET GLIDE ===
        this.handleJump(input, blocks);
    }

    handleGliding() {
        const block = this.glidingBlock;
        if (this.x + GameConfig.PLAYER_SIZE > block.x &&
            this.x < block.x + block.width) {
            this.y = block.y + block.height;
            this.vy = 0;
            this.jumping = false;
        } else {
            this.gliding = false;
            this.glidingBlock = null;
        }
    }

    handleBlockCollisions(blocks) {
        this.wallRiding = false;

        for (const block of blocks) {
            if (this.intersects(block)) {
                if (block.type === BlockType.DEADLY) {
                    this.die();
                    return;
                }
                this.resolveCollision(block);
            }
        }
    }

    intersects(block) {
        return this.x < block.x + block.width &&
            this.x + this.width > block.x &&
            this.y < block.y + block.height &&
            this.y + this.height > block.y;
    }

    resolveCollision(block) {
        const overlapLeft = (this.x + GameConfig.PLAYER_SIZE) - block.x;
        const overlapRight = (block.x + block.width) - this.x;
        const overlapTop = (this.y + GameConfig.PLAYER_SIZE) - block.y;
        const overlapBottom = (block.y + block.height) - this.y;

        const minOverlap = Math.min(
            Math.min(overlapLeft, overlapRight),
            Math.min(overlapTop, overlapBottom)
        );

        if (block.type === BlockType.FINISH) {
            return; 
        }

        if (minOverlap === overlapTop && this.vy >= 0) {
            // Atterrissage sur le bloc
            this.y = block.y - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
            this.onGround = true; // <--- CORRECTION : On considère qu'on est au sol ici aussi
        }
        else if (minOverlap === overlapBottom && this.vy < 0 && !this.gliding) {
            // Tête contre le bloc
            this.y = block.y + block.height;
            this.vy = 0;
        }
        else if (minOverlap === overlapLeft) {
            // Collision côté droit du joueur
            this.x = block.x - GameConfig.PLAYER_SIZE;
            this.handleWallRide(false);
        }
        else if (minOverlap === overlapRight) {
            // Collision côté gauche du joueur
            this.x = block.x + block.width;
            this.handleWallRide(true); 
        }
    }

    handleWallRide(onLeftWall) {
        if (this.jumping && this.vy > 0 && this.forcedMovementFrames === 0) {
            this.wallRiding = true;
            this.wallRideLeft = onLeftWall;
            if (this.vy > GameConfig.WALL_SLIDE_SPEED) {
                this.vy = GameConfig.WALL_SLIDE_SPEED;
            }
        }
    }

handleJump(input, blocks) {
    // J'ai enlevé "&& !this.jumping" car si onGround est true, c'est qu'on peut sauter.
    if (input.up && (this.onGround || this.hasGlideJump)) {
        this.vy = GameConfig.JUMP_VELOCITY;
        this.jumping = true;
        this.onGround = false;
        this.hasGlideJump = false; 
    }
        else if (input.up && this.wallRiding) {
            this.applyWallJump(this.wallRideLeft);
        }

        // Glide
        if (input.down) {
            if (!this.gliding) {
                this.tryGrabCeiling(blocks);
            }
        } else {
            if (this.gliding) {
                this.gliding = false;
                this.glidingBlock = null;
                this.hasGlideJump = true; 
            }
        }
    }

    tryGrabCeiling(blocks) {
        for (const block of blocks) {
            if (this.x + GameConfig.PLAYER_SIZE > block.x && 
                this.x < block.x + block.width) {
                
                if (block.y + block.height <= this.y && 
                    this.y - (block.y + block.height) <= 50) {
                    
                    if (block.type !== BlockType.FINISH && block.type !== BlockType.DEADLY) {
                        this.gliding = true;
                        this.glidingBlock = block;
                        this.y = block.y + block.height;
                        this.vy = 0;
                        this.jumping = false; // Reset le saut en s'accrochant
                        
                        break;
                    }
                }
            }
        }
    }

    applyWallJump(jumpingFromLeft) {
        this.vy = GameConfig.WALL_JUMP_VELOCITY_Y;
        if (jumpingFromLeft) {
            this.forcedHorizontalVelocity = GameConfig.WALL_JUMP_VELOCITY_X;
        } else {
            this.forcedHorizontalVelocity = -GameConfig.WALL_JUMP_VELOCITY_X;
        }
        this.forcedMovementFrames = GameConfig.WALL_JUMP_FRAMES;
        this.jumping = true;
        this.wallRiding = false;
    }

    draw(ctx, camX, camY) {
        const screenX = Math.round(this.x - camX);
        const screenY = Math.round(this.y - camY);

        const centerX = screenX + this.width / 2;
        const centerY = screenY + this.height / 2;
        const radiusX = (this.width + 10) / 2;
        const radiusY = (this.height + 10) / 2;

        if (this.wallRiding) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (this.gliding) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = GameConfig.COLORS.PLAYER;
        ctx.fillRect(screenX, screenY, this.width, this.height);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, this.width, this.height);

        ctx.fillStyle = 'white';
        if (this.facingRight) {
            ctx.fillRect(screenX + 20, screenY + 5, 8, 8);
        } else {
            ctx.fillRect(screenX + 4, screenY + 5, 8, 8);
        }
    }

    die() {
        console.log("Mort !");
        this.x = 50;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.gliding = false;
        this.glidingBlock = null;
        this.wallRiding = false;
        this.jumping = false;
        this.forcedMovementFrames = 0;
        this.onGround = false;
    }
}