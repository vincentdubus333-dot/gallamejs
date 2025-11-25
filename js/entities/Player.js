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
        this.jumping = false;      // Correspond à "jumping" en Java
        this.facingRight = true;
        
        // Wall riding (Java: wallRiding, wallRideLeft)
        this.wallRiding = false;
        this.wallRideLeft = false; // true = mur à gauche, false = mur à droite
        
        // Gliding (plafond/araignée)
        this.gliding = false;
        this.glidingBlock = null;
        
        // Mouvement forcé (wall jump)
        this.forcedHorizontalVelocity = 0;
        this.forcedMovementFrames = 0;
    }

    update(input, level) {
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
        
        // === COLLISION SOL ===
        if (this.y >= groundY - GameConfig.PLAYER_SIZE) {
            this.y = groundY - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
        }
        
        // === COLLISIONS BLOCS ===
        this.handleBlockCollisions(blocks);
        
        // === SAUT ET GLIDE (après collisions pour détecter plafond) ===
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
        // Calcul des chevauchements (exactement comme Java)
        const overlapLeft = (this.x + GameConfig.PLAYER_SIZE) - block.x;
        const overlapRight = (block.x + block.width) - this.x;
        const overlapTop = (this.y + GameConfig.PLAYER_SIZE) - block.y;
        const overlapBottom = (block.y + block.height) - this.y;
        
        const minOverlap = Math.min(
            Math.min(overlapLeft, overlapRight), 
            Math.min(overlapTop, overlapBottom)
        );
        
        if (block.type === BlockType.FINISH) {
            return; // Pas de collision physique
        }
        
        if (minOverlap === overlapTop && this.vy >= 0) {
            // Atterrissage sur le bloc
            this.y = block.y - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
        }
        else if (minOverlap === overlapBottom && this.vy < 0 && !this.gliding) {
            // Tête contre le bloc
            this.y = block.y + block.height;
            this.vy = 0;
            // On ne s'accroche PAS automatiquement
        }
        else if (minOverlap === overlapLeft) {
            // Collision côté droit du joueur
            this.x = block.x - GameConfig.PLAYER_SIZE;
            this.handleWallRide(false); // Mur à droite
        }
        else if (minOverlap === overlapRight) {
            // Collision côté gauche du joueur
            this.x = block.x + block.width;
            this.handleWallRide(true); // Mur à gauche
        }
    }

    handleWallRide(onLeftWall) {
        // Conditions exactes du Java
        if (this.jumping && this.vy > 0 && this.forcedMovementFrames === 0) {
            this.wallRiding = true;
            this.wallRideLeft = onLeftWall;
            if (this.vy > GameConfig.WALL_SLIDE_SPEED) {
                this.vy = GameConfig.WALL_SLIDE_SPEED;
            }
        }
    }

    handleJump(input, blocks) {
        // Saut normal : au sol OU pendant le coyote time
        const canJump = (this.vy === 0) || (this.coyoteTimeFrames > 0);
        
        if (input.up && !this.jumping && canJump) {
            this.vy = GameConfig.JUMP_VELOCITY;
            this.jumping = true;
            this.coyoteTimeFrames = 0; // Consomme le coyote time
        }
        
        // Wall jump (exactement comme Java)
        if (input.up && this.wallRiding) {
            this.applyWallJump(this.wallRideLeft);
        }
        
        // Gestion du glide : MAINTENIR DOWN pour rester accroché
        if (input.down) {
            if (!this.gliding) {
                // Essayer de s'accrocher si pas déjà accroché
                this.tryGrabCeiling(blocks);
            }
        } else {
            // Si on relâche DOWN, on lâche le plafond
            if (this.gliding) {
                this.gliding = false;
                this.glidingBlock = null;
            }
        }
    }

    // Détection du bloc au-dessus (logique Java exacte)
    tryGrabCeiling(blocks) {
        for (const block of blocks) {
            // Vérifier si le joueur est horizontalement aligné avec le bloc
            if (this.x + GameConfig.PLAYER_SIZE > block.x && 
                this.x < block.x + block.width) {
                
                // Vérifier si le bloc est au-dessus ET à moins de 50 pixels
                if (block.y + block.height <= this.y && 
                    this.y - (block.y + block.height) <= 50) {
                    
                    // Pas d'accroche sur DEADLY ou FINISH
                    if (block.type !== BlockType.FINISH && block.type !== BlockType.DEADLY) {
                        this.gliding = true;
                        this.glidingBlock = block;
                        this.y = block.y + block.height;
                        this.vy = 0;
                        this.jumping = false;
                        this.coyoteTimeFrames = 0;
                        console.log("Accroche au plafond réussie !");
                        break;
                    }
                }
            }
        }
    }

    // Détection du bloc juste au-dessus de la tête
    detectCeiling(blocks) {
        const checkY = this.y - 10; // Zone de détection au-dessus
        const checkX = this.x + 5;
        const checkW = this.width - 10;
        const checkH = 15;

        for (const block of blocks) {
            // Collision avec la zone de détection
            if (checkX < block.x + block.width &&
                checkX + checkW > block.x &&
                checkY < block.y + block.height &&
                checkY + checkH > block.y) {
                
                // Pas d'accroche sur les zones dangereuses ou de fin
                if (block.type !== BlockType.FINISH && block.type !== BlockType.DEADLY) {
                    return block;
                }
            }
        }
        return null;
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

        // 1. Auras visuelles
        if (this.wallRiding) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; // Cyan (Wall Slide)
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (this.gliding) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Violet (Plafond)
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Corps du Joueur
        ctx.fillStyle = GameConfig.COLORS.PLAYER;
        ctx.fillRect(screenX, screenY, this.width, this.height);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, this.width, this.height);

        // 3. Yeux
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
    }
}