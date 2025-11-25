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
        this.hasGlideJump = false; // Autorise un saut juste après avoir quitté le plafond

        // Mouvement forcé (wall jump)
        this.forcedHorizontalVelocity = 0;
        this.forcedMovementFrames = 0;
        
        // Signal de mort pour demander le reset du niveau à main.js
        this.justDied = false;
    }

    update(input, level) {
        const blocks = level.blocks;
        const mobs = level.mobs || []; // On récupère les mobs du niveau
        const groundY = GameConfig.GROUND_Y;

        // Reset de l'état "au sol"
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
            this.hasGlideJump = false; // On est au sol, on n'a plus besoin du saut bonus de glide
        }

        // === 4. COLLISIONS AVEC LES BLOCS ===
        this.handleBlockCollisions(blocks);

        // === 5. COLLISIONS AVEC LES MOBS (NOUVEAU) ===
        this.handleMobCollisions(mobs);

        // === 6. SAUT, WALL JUMP ET GLIDE ===
        this.handleJump(input, blocks);
    }

    handleGliding() {
        const block = this.glidingBlock;
        // Vérifie si le joueur est toujours sous le bloc
        if (this.x + GameConfig.PLAYER_SIZE > block.x &&
            this.x < block.x + block.width) {
            this.y = block.y + block.height;
            this.vy = 0;
            this.jumping = false;
        } else {
            // Le joueur n'est plus sous le bloc (il tombe ou lâche)
            this.gliding = false;
            this.glidingBlock = null;
            // On lui donne une chance de sauter (Coyote Time)
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

    handleMobCollisions(mobs) {
        for (const mob of mobs) {
            // "intersects" fonctionne avec n'importe quel objet ayant x, y, width, height
            if (this.intersects(mob)) {
                // Pour l'instant, toucher un mob = mort instantanée
                this.die();
                return;
            }
        }
    }

    intersects(obj) {
        return this.x < obj.x + obj.width &&
            this.x + this.width > obj.x &&
            this.y < obj.y + obj.height &&
            this.y + this.height > obj.y;
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
            // Atterrissage sur le dessus
            this.y = block.y - GameConfig.PLAYER_SIZE;
            this.vy = 0;
            this.jumping = false;
            this.gliding = false;
            this.onGround = true; 
            this.hasGlideJump = false;
        }
        else if (minOverlap === overlapBottom && this.vy < 0 && !this.gliding) {
            // Tête contre le bas du bloc
            this.y = block.y + block.height;
            this.vy = 0;
        }
        else if (minOverlap === overlapLeft) {
            // Collision côté droit du joueur
            this.x = block.x - GameConfig.PLAYER_SIZE;
            this.handleWallRide(false);
            this.hasGlideJump = false; 
        }
        else if (minOverlap === overlapRight) {
            // Collision côté gauche du joueur
            this.x = block.x + block.width;
            this.handleWallRide(true);
            this.hasGlideJump = false; 
        }
    }

    handleWallRide(onLeftWall) {
        // Wall Slide : s'active si on descend contre un mur
        if (this.vy > 0 && this.forcedMovementFrames === 0) {
            this.wallRiding = true;
            this.wallRideLeft = onLeftWall;
            // Ralentir la chute
            if (this.vy > GameConfig.WALL_SLIDE_SPEED) {
                this.vy = GameConfig.WALL_SLIDE_SPEED;
            }
        }
    }

    handleJump(input, blocks) {
        // SAUT STANDARD ou SAUT BONUS (Coyote Jump après glide)
        // Condition : Appui Haut ET (Au sol OU Saut Bonus Disponible)
        if (input.up && (this.onGround || this.hasGlideJump) && !this.jumping) {
            this.vy = GameConfig.JUMP_VELOCITY;
            this.jumping = true;
            this.onGround = false;
            this.hasGlideJump = false; // Le bonus est consommé
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
            // Si on relâche la touche bas, on lâche le plafond
            if (this.gliding) {
                this.gliding = false;
                this.glidingBlock = null;
                this.hasGlideJump = true; // On active le saut bonus
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
        
        // Reset à la position de départ sauvegardée
        this.x = this.startX; 
        this.y = this.startY; 
        
        this.vx = 0;
        this.vy = 0;
        
        // Reset des états
        this.gliding = false;
        this.glidingBlock = null;
        this.hasGlideJump = false;
        this.wallRiding = false;
        this.jumping = false;
        this.forcedMovementFrames = 0;

        // Signal pour main.js : "Reset les mobs !"
        this.justDied = true; 
    }
}