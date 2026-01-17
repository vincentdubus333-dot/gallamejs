// js/entities/Player.js
import { GameConfig } from '../GameConfig.js';
import { BlockType } from '../world/Block.js';

export class Player {
    constructor(x, y) {
        // Sauvegarde de la position de départ pour le respawn
        this.startX = x;
        this.startY = y;

        this.x = x;
        this.y = y;
        this.width = GameConfig.PLAYER_SIZE;
        this.height = GameConfig.PLAYER_SIZE;

        // Physique
        this.vx = 0;
        this.vy = 0;

        // États de base
        this.jumping = false;
        this.facingRight = true;
        this.onGround = false;

        // Wall riding
        this.wallRiding = false;
        this.wallRideLeft = false;

        // Gliding & Coyote Jump (Saut bonus)
        this.gliding = false;
        this.glidingBlock = null;
        this.hasGlideJump = false;

        // Mouvement forcé (wall jump)
        this.forcedHorizontalVelocity = 0;
        this.forcedMovementFrames = 0;
        
        // Signal de mort pour demander le reset du niveau à main.js
        this.justDied = false;

        // COYOTE TIME : Temps de grâce après avoir quitté le sol
        this.coyoteFrames = 0;
        this.COYOTE_TIME = 6; // 6 frames = ~100ms à 60fps
    }

    update(input, level) {
        const blocks = level.blocks;
        const groundY = GameConfig.GROUND_Y;

        // Stockage de l'état précédent
        const wasOnGround = this.onGround;
        this.onGround = false;

        // === 1. MOUVEMENTS HORIZONTAUX ===
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

        // Limites du monde (gauche / droite)
        if (this.x < 0) this.x = 0;
        if (this.x > GameConfig.WORLD_WIDTH - GameConfig.PLAYER_SIZE) {
            this.x = GameConfig.WORLD_WIDTH - GameConfig.PLAYER_SIZE;
        }

        // === 2. GRAVITÉ ET GLIDE ===
        if (this.gliding && this.glidingBlock !== null) {
            this.handleGliding();
        } else {
            this.vy += GameConfig.GRAVITY;
            this.y += this.vy;
        }

        // === 3. COLLISION AVEC LE SOL DU MONDE ===
        if (this.y >= groundY - GameConfig.PLAYER_SIZE) {
            this.y = groundY - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
            this.onGround = true;
            this.hasGlideJump = false;
        }

        // === 4. COLLISIONS AVEC LES BLOCS ===
        this.handleBlockCollisions(blocks);

        // === 5. GESTION DU COYOTE TIME ===
        if (this.onGround) {
            this.coyoteFrames = this.COYOTE_TIME;
        } else if (this.coyoteFrames > 0) {
            this.coyoteFrames--;
        }

        // === 6. SAUT, WALL JUMP ET GLIDE ===
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
            this.hasGlideJump = true;
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

        if (block.type === BlockType.FINISH) return;

        if (minOverlap === overlapTop && this.vy >= 0) {
            this.y = block.y - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
            this.onGround = true;
            this.hasGlideJump = false;
        }
        else if (minOverlap === overlapBottom && this.vy < 0 && !this.gliding) {
            this.y = block.y + block.height;
            this.vy = 0;
        }
        else if (minOverlap === overlapLeft) {
            this.x = block.x - GameConfig.PLAYER_SIZE;
            this.handleWallRide(false);
            this.hasGlideJump = false;
        }
        else if (minOverlap === overlapRight) {
            this.x = block.x + block.width;
            this.handleWallRide(true);
            this.hasGlideJump = false;
        }
    }

    handleWallRide(onLeftWall) {
        if (this.vy > 0 && this.forcedMovementFrames === 0) {
            this.wallRiding = true;
            this.wallRideLeft = onLeftWall;
            if (this.vy > GameConfig.WALL_SLIDE_SPEED) {
                this.vy = GameConfig.WALL_SLIDE_SPEED;
            }
        }
    }

    handleJump(input, blocks) {
        // Condition améliorée : On peut sauter si :
        // - On est au sol OU
        // - On a encore du Coyote Time (vient de quitter le sol) OU
        // - On a le bonus de Glide Jump
        const canJump = this.onGround || this.coyoteFrames > 0 || this.hasGlideJump;

        // SAUT STANDARD ou SAUT BONUS
        if (input.up && canJump && !this.jumping) {
            this.vy = GameConfig.JUMP_VELOCITY;
            this.jumping = true;
            this.onGround = false;
            this.hasGlideJump = false;
            this.coyoteFrames = 0; // On consomme le coyote time
        }
        // WALL JUMP
        else if (input.up && this.wallRiding) {
            this.applyWallJump(this.wallRideLeft);
        }

        // GLIDE (Accrochage plafond)
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
                        this.jumping = false;
                        this.hasGlideJump = false;
                        console.log("Gliding!");
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
        this.coyoteFrames = 0; // Reset du coyote time
    }

    draw(ctx, camX, camY) {
        const screenX = Math.round(this.x - camX);
        const screenY = Math.round(this.y - camY);
        const centerX = screenX + this.width / 2;
        const centerY = screenY + this.height / 2;
        const radiusX = (this.width + 10) / 2;
        const radiusY = (this.height + 10) / 2;

        // Auras visuelles
        if (this.wallRiding) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; // Cyan
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (this.gliding) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Violet
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corps du joueur
        ctx.fillStyle = GameConfig.COLORS.PLAYER;
        ctx.fillRect(screenX, screenY, this.width, this.height);
        
        // Contour
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, this.width, this.height);

        // Yeux
        ctx.fillStyle = 'white';
        if (this.facingRight) {
            ctx.fillRect(screenX + 20, screenY + 5, 8, 8);
        } else {
            ctx.fillRect(screenX + 4, screenY + 5, 8, 8);
        }
    }

    die() {
        console.log("Mort !");
        
        this.x = this.startX;
        this.y = this.startY;
        
        this.vx = 0;
        this.vy = 0;
        
        this.gliding = false;
        this.glidingBlock = null;
        this.hasGlideJump = false;
        this.wallRiding = false;
        this.jumping = false;
        this.forcedMovementFrames = 0;
        this.coyoteFrames = 0; // Reset du coyote time

        this.justDied = true;
    }
}