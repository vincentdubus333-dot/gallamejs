// js/input/InputHandler.js

export class InputHandler {
    constructor() {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }
    
    // Helpers pour Mario
    get left() { return this.isDown('ArrowLeft') || this.isDown('KeyA'); }
    get right() { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
    get up() { return this.isDown('ArrowUp') || this.isDown('KeyW') || this.isDown('Space'); }
    get down() { return this.isDown('ArrowDown') || this.isDown('KeyS'); }
    get enter() { return this.isDown('Enter'); }get enter() { return this.isDown('Enter'); }
    }