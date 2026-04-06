import nipplejs from 'nipplejs';

export class InputManager {
  constructor() {
    this.moveVector = { x: 0, y: 0 };
    this.lookVector = { x: 0, y: 0 };
    this.isJumping = false;
  }

  init() {
    // Setup Nipple.js virtual joysticks
    const leftZone = document.getElementById('joystick-left-zone');
    const rightZone = document.getElementById('joystick-right-zone');

    this.joystickLeft = nipplejs.create({
      zone: leftZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white'
    });

    this.joystickRight = nipplejs.create({
      zone: rightZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white'
    });

    this.joystickLeft.on('move', (evt, data) => {
      this.moveVector.x = data.vector.x;
      this.moveVector.y = data.vector.y;
    });
    this.joystickLeft.on('end', () => {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    });

    this.joystickRight.on('move', (evt, data) => {
      this.lookVector.x = data.vector.x;
      this.lookVector.y = data.vector.y;
    });
    this.joystickRight.on('end', () => {
      this.lookVector.x = 0;
      this.lookVector.y = 0;
    });

    // Keyboard fallback for desktop testing
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Jump button
    const btnAction = document.getElementById('btn-action');
    btnAction.addEventListener('pointerdown', () => {
      this.isJumping = true;
    });
    btnAction.addEventListener('pointerup', () => {
      this.isJumping = false;
    });
  }

  onKeyDown(e) {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.moveVector.y = 1;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.moveVector.y = -1;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.moveVector.x = -1;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') this.moveVector.x = 1;
    if (e.code === 'Space') this.isJumping = true;

    // Simple camera fallback
    if (e.code === 'KeyQ') this.lookVector.x = -1;
    if (e.code === 'KeyE') this.lookVector.x = 1;
  }

  onKeyUp(e) {
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) this.moveVector.y = 0;
    if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code)) this.moveVector.x = 0;
    if (e.code === 'Space') this.isJumping = false;
    
    if (['KeyQ', 'KeyE'].includes(e.code)) this.lookVector.x = 0;
  }
}
