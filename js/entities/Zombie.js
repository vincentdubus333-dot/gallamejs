import { GameConfig } from '../GameConfig.js';
import { BlockType } from '../world/Block.js';

// ==========================================
// 1. LA CLASSE PRINCIPALE (L'Entité)
// ==========================================
export class MobZombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        
        // Physique
        this.vx = 0;
        this.vy = 0;
        this.speed = 1.5; // Vitesse de base
        this.onGround = false;

        // État
        this.direction = 1; // 1 = Droite, -1 = Gauche
        this.stateMachine = new StateMachine(this);
        
        // On démarre en patrouille
        this.stateMachine.changeState(new PatrolState());
    }

    update(dt, player, level) {
        // Délègue la logique à la machine à états
        this.stateMachine.update(player, level.blocks, GameConfig.GROUND_Y);
    }

    draw(ctx, camX, camY) {
        const sx = Math.round(this.x - camX);
        const sy = Math.round(this.y - camY);

        // Couleur ZOMBIE (Vert)
        ctx.fillStyle = '#2E8B57'; // SeaGreen
        ctx.fillRect(sx, sy, this.width, this.height);

        // Contour
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, this.width, this.height);

        // Yeux (Rouges pour faire méchant)
        ctx.fillStyle = '#8B0000';
        if (this.direction > 0) {
            ctx.fillRect(sx + 20, sy + 6, 6, 6);
        } else {
            ctx.fillRect(sx + 6, sy + 6, 6, 6);
        }

        // Debug de l'état (facultatif, affiche P ou C au dessus)
        // ctx.fillStyle = 'white';
        // ctx.font = '10px Arial';
        // ctx.fillText(this.stateMachine.currentState.constructor.name.charAt(0), sx + 10, sy - 5);
    }

    // Helpers pour la physique
    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

// ==========================================
// 2. LA MACHINE À ÉTATS
// ==========================================
class StateMachine {
    constructor(mob) {
        this.mob = mob;
        this.currentState = null;
    }

    changeState(newState) {
        if (this.currentState) {
            this.currentState.exit(this.mob);
        }
        this.currentState = newState;
        if (this.currentState) {
            this.currentState.enter(this.mob);
        }
    }

    update(player, blocks, groundY) {
        if (this.currentState) {
            this.currentState.update(this.mob, player, blocks, groundY, this);
        }
    }
}

// ==========================================
// 3. LES ÉTATS (Logique métier)
// ==========================================

// --- État de base (Gère la physique et les collisions) ---
class GroundedState {
    enter(mob) {}
    exit(mob) {}

    update(mob, player, blocks, groundY, fsm) {
        // 1. Logique spécifique à l'état (Patrouille ou Chasse)
        this.handleBehavior(mob, player, blocks, groundY, fsm);

        // 2. Physique (Gravité)
        mob.vy += GameConfig.GRAVITY;
        mob.x += mob.vx;
        mob.y += mob.vy;
        mob.onGround = false;

        // 3. Collision Sol Global
        if (mob.y >= groundY - mob.height) {
            mob.y = groundY - mob.height;
            mob.vy = 0;
            mob.onGround = true;
        }

        // 4. Collisions Blocs
        this.handleBlockCollisions(mob, blocks);
    }

    handleBlockCollisions(mob, blocks) {
        const mobRect = mob.getBounds();

        for (const block of blocks) {
            // On ignore les pièges pour la physique pure (sinon il marche dessus)
            if (block.type === BlockType.DEADLY || block.type === BlockType.FINISH) continue;

            if (checkCollision(mobRect, block)) {
                this.resolveCollision(mob, block);
            }
        }
    }

    resolveCollision(mob, block) {
        const overlapLeft = (mob.x + mob.width) - block.x;
        const overlapRight = (block.x + block.width) - mob.x;
        const overlapTop = (mob.y + mob.height) - block.y;
        const overlapBottom = (block.y + block.height) - mob.y;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop && mob.vy >= 0) {
            mob.y = block.y - mob.height;
            mob.vy = 0;
            mob.onGround = true;
        } 
        else if (minOverlap === overlapBottom && mob.vy < 0) {
            mob.y = block.y + block.height;
            mob.vy = 0;
        } 
        else if (minOverlap === overlapLeft) {
            mob.x = block.x - mob.width;
            this.onWallHit(mob, block); // Hook pour l'IA
        } 
        else if (minOverlap === overlapRight) {
            mob.x = block.x + block.width;
            this.onWallHit(mob, block); // Hook pour l'IA
        }
    }

    // Méthodes à surcharger par les enfants
    handleBehavior(mob, player, blocks, groundY, fsm) {}
    onWallHit(mob, block) {}
}

// --- État Patrouille (Marche et fait demi-tour) ---
class PatrolState extends GroundedState {
    enter(mob) {
        mob.vx = mob.direction * mob.speed;
    }

    handleBehavior(mob, player, blocks, groundY, fsm) {
        // Détection Joueur
        const dist = Math.abs(player.x - mob.x);
        const CHASE_RANGE = 350;

        if (dist < CHASE_RANGE) {
            fsm.changeState(new ChaseState());
            return;
        }

        // Vérifier le vide devant
        if (!this.isGroundInFront(mob, blocks, groundY)) {
            this.turnAround(mob);
        }
    }

    onWallHit(mob, block) {
        this.turnAround(mob);
    }

    turnAround(mob) {
        mob.direction *= -1;
        mob.vx = mob.direction * mob.speed;
    }

    isGroundInFront(mob, blocks, groundY) {
        const checkDist = 10;
        // On regarde devant les pieds
        const checkX = mob.direction > 0 ? mob.x + mob.width + checkDist : mob.x - checkDist;
        const checkY = mob.y + mob.height + 2;

        // Sol global
        if (checkY >= groundY) return true;

        // Blocs
        // Petit rectangle de test 1x1 pixel
        const point = { x: checkX, y: checkY, width: 1, height: 1 };
        for (const block of blocks) {
            if (checkCollision(point, block)) return true;
        }
        return false;
    }
}

// --- État Poursuite (Suit le joueur et saute) ---
class ChaseState extends GroundedState {
    enter(mob) {
        // Petit effet visuel ou sonore possible ici
    }

    handleBehavior(mob, player, blocks, groundY, fsm) {
        const dist = Math.abs(player.x - mob.x);
        const LOSE_RANGE = 500;

        // Abandon
        if (dist > LOSE_RANGE) {
            fsm.changeState(new PatrolState());
            return;
        }

        // Mouvement vers le joueur
        const chaseSpeed = mob.speed * 1.5; // Plus rapide quand il court
        
        if (player.x < mob.x) {
            mob.vx = -chaseSpeed;
            mob.direction = -1;
        } else {
            mob.vx = chaseSpeed;
            mob.direction = 1;
        }

        // Logique de saut (Obstacle ou joueur en hauteur)
        if (mob.onGround && this.shouldJump(mob, player, blocks)) {
            mob.vy = GameConfig.JUMP_VELOCITY; // Utilise la config globale ou une valeur custom
            mob.onGround = false;
        }
    }

    onWallHit(mob, block) {
        // Si on tape un mur en chasse, on essaie de sauter si on est au sol
        if (mob.onGround) {
            mob.vy = GameConfig.JUMP_VELOCITY;
            mob.onGround = false;
        }
    }

    shouldJump(mob, player, blocks) {
        // 1. Joueur au dessus ?
        if (player.y < mob.y - 50 && Math.abs(player.x - mob.x) < 100) return true;

        // 2. Obstacle devant ?
        const checkX = mob.direction > 0 ? mob.x + mob.width + 5 : mob.x - 5;
        const checkY = mob.y + mob.height - 10;
        const checkRect = { x: checkX, y: checkY, width: 5, height: 10 };

        for (const block of blocks) {
            if (checkCollision(checkRect, block)) return true;
        }
        return false;
    }
}

// ==========================================
// 4. UTILITAIRES
// ==========================================
function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}