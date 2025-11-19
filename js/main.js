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
    enterWasPressed: false // <-- FIX : Anti-double appel
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
// --- MISE À JOUR LOGIQUE ---
function update(dt) {
    if (gameState.isGameWon) {
        const enterIsDown = input.isDown('Enter');
        
        if (enterIsDown && !gameState.enterWasPressed) {
            console.log("Passage au niveau suivant...");
            currentLevelIndex++;
            loadLevel(currentLevelIndex);
        }
        
        // ⚠️ On met à jour APRÈS le traitement
        gameState.enterWasPressed = enterIsDown;
        return;
    }

    // Reset du flag Enter quand on joue
    gameState.enterWasPressed = false;

    if (player && currentLevel) {
        player.update(input, currentLevel);
        updateCamera();
        gameState.currentTime += dt;
        checkVictory();
    }
}

// --- VÉRIFICATION VICTOIRE ---
function checkVictory() {
    if (!currentLevel || !player || gameState.isGameWon) return; // ✅ Ajout de la vérification

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