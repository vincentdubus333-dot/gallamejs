// js/main.js
import { GameConfig } from './GameConfig.js';
import { LevelLoader } from './level/LevelLoader.js';
import { Renderer } from './rendering/Renderer.js';
import { Player } from './entities/Player.js';
import { InputHandler } from './input/InputHandler.js';
import { Camera } from './world/Camera.js';

// --- INITIALISATION ---
const canvas = document.getElementById('gameCanvas');
canvas.width = GameConfig.WINDOW_WIDTH;
canvas.height = GameConfig.WINDOW_HEIGHT;

const renderer = new Renderer(canvas);
const input = new InputHandler();
const loader = new LevelLoader();

// --- LISTE DES NIVEAUX ---
const LEVELS = [
    'assets/niveau10.txt',
    'assets/niveau11.txt',
    'assets/niveau1.txt',
    'assets/niveau2.txt',
    'assets/niveau3.txt',
    'assets/niveau4.txt',
    'assets/niveau5.txt',
    'assets/niveau6.txt',
    'assets/niveau7.txt',
    'assets/niveau8.txt',
    'assets/niveaugemini.txt'
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
    enterWasPressed: false,
    eKeyWasPressed: false // Pour éviter les doubles activations de porte
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
    gameState.eKeyWasPressed = false;

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

// --- CHARGEMENT D'UN NIVEAU VIA PORTE ---
async function loadLevelFromDoor(door) {
    if (gameState.isLoading) return;
    
    console.log(`🚪 Passage par la porte vers: ${door.targetLevelFile}`);
    
    gameState.isLoading = true;
    gameState.isGameWon = false;
    gameState.eKeyWasPressed = false;

    try {
        // Charger le nouveau niveau
        currentLevel = await loader.load(door.targetLevelFile);

        if (!currentLevel) {
            throw new Error("Niveau introuvable");
        }

        // Calculer la position Y absolue du joueur
        // Si targetY est null, on utilise la position de départ du niveau
        let newX, newY;
        
        if (door.targetX !== null && door.targetY !== null) {
            newX = door.targetX;
            // targetY est la distance depuis le sol
            newY = GameConfig.GROUND_Y - door.targetY - GameConfig.PLAYER_SIZE;
        } else {
            // Sinon, position de départ du niveau
            newX = currentLevel.startX;
            newY = currentLevel.startY;
        }

        // Créer un nouveau joueur à cette position
        player = new Player(newX, newY);

        // Réinitialiser la caméra
        camera.x = player.x - (GameConfig.WINDOW_WIDTH / 2);
        camera.y = player.y - (GameConfig.WINDOW_HEIGHT / 2);
        camera.targetX = camera.x;
        camera.targetY = camera.y;

        gameState.currentTime = 0;

        console.log(`✅ Joueur téléporté à: (${newX}, ${newY})`);

    } catch (e) {
        alert(`Erreur lors du passage de la porte : ` + e.message);
        console.error(e);
    } finally {
        gameState.isLoading = false;
    }
}

// --- VÉRIFICATION DES COLLISIONS ---
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

// --- VÉRIFICATION DES PORTES ---
function checkDoorInteraction() {
    if (!currentLevel || !player) return;

    const playerBounds = {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height
    };

    let doorIsNear = false;

    for (const door of currentLevel.doors) {
        const doorBounds = {
            x: door.x,
            y: door.y,
            width: door.width,
            height: door.height
        };

        // Vérifier la collision
        if (checkCollision(playerBounds, doorBounds)) {
            door.isActive = true;
            doorIsNear = true;

            // Si le joueur appuie sur E (et qu'il ne l'avait pas déjà pressé)
            const eIsDown = input.isDown('e') || input.isDown('E');
            
            if (eIsDown && !gameState.eKeyWasPressed) {
                loadLevelFromDoor(door);
            }
            
            gameState.eKeyWasPressed = eIsDown;
        } else {
            door.isActive = false;
        }
    }

    // Réinitialiser le flag si aucune porte n'est proche
    if (!doorIsNear) {
        gameState.eKeyWasPressed = false;
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

    // Ne pas jouer pendant le chargement
    if (gameState.isLoading) {
        return;
    }

    // Reset du flag Enter quand on joue
    gameState.enterWasPressed = false;

    if (player && currentLevel) {
        player.update(input, currentLevel);
        updateCamera();
        checkDoorInteraction(); // ✅ AJOUT : Vérifier les portes
        gameState.currentTime += dt;
        checkVictory();
    }
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