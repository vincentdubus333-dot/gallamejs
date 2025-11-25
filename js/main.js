import { GameConfig } from './GameConfig.js';
import { LevelLoader } from './level/LevelLoader.js';
import { Renderer } from './rendering/Renderer.js';
import { Player } from './entities/Player.js';
import { InputHandler } from './input/InputHandler.js';
import { Camera } from './world/Camera.js';
import { Walker } from './entities/Walker.js';
// On peut importer MobZombie pour vérifier le type, ou utiliser le "Duck Typing" (voir plus bas)

// --- INITIALISATION ---
const canvas = document.getElementById('gameCanvas');
canvas.width = GameConfig.WINDOW_WIDTH;
canvas.height = GameConfig.WINDOW_HEIGHT;

const renderer = new Renderer(canvas);
const input = new InputHandler();
const loader = new LevelLoader();

// --- LISTE DES NIVEAUX ---
const LEVELS = [
    'assets/niveau12.txt',
    'assets/niveau1.txt',
    'assets/niveau2.txt',
    'assets/niveau3.txt',
    'assets/niveau4.txt',
    'assets/niveau5.txt',
    'assets/niveau6.txt',
    'assets/niveau7.txt',
    'assets/niveau10.txt',
    'assets/niveaugemini.txt',
    'assets/niveau11.txt'
];

// --- ÉTAT DU JEU ---
let currentLevel = null;
let player = null;
let camera = null;
let lastTime = 0;
let currentLevelIndex = 0;

const gameState = {
    isCountingDown: false,
    countdown: 0,
    isGameWon: false,
    currentTime: 0,
    bestTime: Infinity,
    isLoading: false,
    enterWasPressed: false
};

// --- DÉMARRAGE ---
async function start() {
    GameConfig.printScaleInfo();
    await loadLevel(currentLevelIndex);
    requestAnimationFrame(gameLoop);
}

// --- FONCTION DE CHARGEMENT ---
async function loadLevel(index) {
    if (gameState.isLoading) {
        console.log("Chargement déjà en cours, ignoré.");
        return;
    }
    gameState.isLoading = true;
    gameState.isGameWon = false;
    gameState.enterWasPressed = false;

    if (index >= LEVELS.length) {
        alert("Félicitations ! Tu as terminé tous les niveaux !");
        currentLevelIndex = 0;
        index = 0;
    }

    const levelPath = LEVELS[index];
    console.log(`--- Chargement du niveau ${index + 1}: ${levelPath} ---`);

    try {
        currentLevel = await loader.load(levelPath);

        if (!currentLevel) {
            throw new Error("Niveau vide ou introuvable");
        }

        player = new Player(currentLevel.startX, currentLevel.startY);

        camera = new Camera(
            GameConfig.WINDOW_WIDTH,
            GameConfig.WINDOW_HEIGHT,
            GameConfig.WORLD_WIDTH,
            GameConfig.CAMERA_MIN_Y,
            GameConfig.CAMERA_MAX_Y
        );

        // Centrage forcé
        camera.x = player.x - (GameConfig.WINDOW_WIDTH / 2);
        camera.y = player.y - (GameConfig.WINDOW_HEIGHT / 2);
        camera.targetX = camera.x;
        camera.targetY = camera.y;

        gameState.currentTime = 0;

    } catch (e) {
        alert(`Erreur critique lors du chargement de ${levelPath} : ` + e.message);
        console.error(e);
    } finally {
        gameState.isLoading = false;
    }
}

// --- BOUCLE DE JEU ---
function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (currentLevel && player && camera) {
        update(dt);
        render();
    }

    requestAnimationFrame(gameLoop);
}

// --- MISE À JOUR LOGIQUE ---

function update(dt) {
    // VICTOIRE : Passage au niveau suivant
    if (gameState.isGameWon) {
        const enterIsDown = input.isDown('Enter');
        
        if (enterIsDown && !gameState.enterWasPressed) {
            console.log("Passage au niveau suivant...");
            currentLevelIndex++;
            loadLevel(currentLevelIndex);
        }
        
        gameState.enterWasPressed = enterIsDown;
        return;
    }

    if (gameState.isLoading) {
        return;
    }

    gameState.enterWasPressed = false;

    if (player && currentLevel) {
        // 1. Mise à jour du Joueur
        player.update(input, currentLevel);

        // 2. Gestion du RESET (Mort du joueur)
        // La logique est déportée dans la fonction handlePlayerDeath
        if (player.justDied) {
            handlePlayerDeath();
        }

        // 3. Gestion des Mobs (IA, Aggro, Update)
        // La logique est déportée dans la fonction updateMobs
        updateMobs(dt);

        // 4. Mise à jour des NPCs
        if (currentLevel.npcs) {
            currentLevel.npcs.forEach(npc => {
                if (npc.update) npc.update(dt);
            });
        }
        
        updateCamera();
        gameState.currentTime += dt;
        checkVictory();
    }
}

// --- FONCTIONS AJOUTÉES (Gestion Mobs) ---

/**
 * Gère la réinitialisation des mobs quand le joueur meurt
 */
function handlePlayerDeath() {
    console.log("-> Reset du niveau demandé.");
            
    if (currentLevel.mobs) {
        currentLevel.mobs.forEach(mob => {
            // Si le mob a une méthode reset() (ex: MobZombie), on l'appelle
            if (typeof mob.reset === 'function') {
                mob.reset(); 
            } 
            // Sinon (ex: ancien Walker), on fait un reset manuel si possible
            else if (mob.startX !== undefined && mob.startY !== undefined) {
                mob.x = mob.startX;
                mob.y = mob.startY;
                if (mob.vx !== undefined) mob.vx = 0;
                if (mob.vy !== undefined) mob.vy = 0;
            }
        });
    }
    player.justDied = false;
}

/**
 * Gère l'IA des mobs et leur mise à jour
 */
function updateMobs(dt) {
    if (!currentLevel.mobs) return;

    // A. Trouver le mob le plus proche (Système d'Aggro unique)
    let nearestMob = null;
    let minDistance = Infinity;
    const MAX_AGGRO_RANGE = 600; // Distance max pour commencer à chasser

    currentLevel.mobs.forEach(mob => {
        if (mob.isAlive !== false) { // Vérifie qu'il n'est pas mort (si la propriété existe)
            const dist = Math.abs(mob.x - player.x);
            if (dist < MAX_AGGRO_RANGE && dist < minDistance) {
                minDistance = dist;
                nearestMob = mob;
            }
        }
    });

    // B. Mettre à jour les mobs
    currentLevel.mobs.forEach(mob => {
        if (mob.update) {
            // Seul le mob le plus proche a le droit d'être agressif (pour optimiser)
            // (Note: Cela dépend si le mob utilise ce paramètre 'canAggro')
            const canAggro = (mob === nearestMob);
            
            // GESTION DE COMPATIBILITÉ :
            // MobZombie attend (dt, player, level)
            // Walker attend (dt, blocks)
            // On regarde le nombre d'arguments attendus par la fonction update
            
            if (mob.update.length >= 3) {
                // Signature MobZombie
                mob.update(dt, player, currentLevel);
            } else {
                // Signature Walker (ignore les arguments en trop en JS, donc safe)
                mob.update(dt, currentLevel.blocks, player, canAggro);
            }
        }
    });
}

// --- VÉRIFICATION VICTOIRE ---
function checkVictory() {
    if (!currentLevel || !player || gameState.isGameWon) return;

    for (const zone of currentLevel.endZones) {
        if (player.x < zone.rect.x + zone.rect.width &&
            player.x + player.width > zone.rect.x &&
            player.y < zone.rect.y + zone.rect.height &&
            player.y + player.height > zone.rect.y) {
            
            console.log("VICTOIRE ! Zone atteinte.");
            gameState.isGameWon = true;
            player.vx = 0;
            player.vy = 0;
            return;
        }
    }
}

// --- CAMÉRA ---
function updateCamera() {
    if (camera && player) {
        camera.update(player.x, player.y, player.width);
    }
}

// --- RENDU ---
function render() {
    if (renderer && currentLevel) {
        renderer.render(currentLevel, player, camera, gameState);
    }
}

start();