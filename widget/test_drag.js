const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    console.log('[TEST] Starting Automated Window Dragging Test Suite...');

    const win = new BrowserWindow({
        width: 385,
        height: 231,
        x: 100,
        y: 100,
        frame: false,
        transparent: true,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'widget', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    // Register drag handlers
    ipcMain.handle('move-window-delta', (event, { dx, dy }) => {
        const [x, y] = win.getPosition();
        const targetX = Math.round(x + (dx || 0));
        const targetY = Math.round(y + (dy || 0));
        win.setPosition(targetX, targetY);
        return { x: targetX, y: targetY };
    });

    ipcMain.handle('set-window-position', (event, { x, y }) => {
        win.setPosition(Math.round(x), Math.round(y));
        return { x: Math.round(x), y: Math.round(y) };
    });

    ipcMain.handle('get-window-position', (event) => {
        const [x, y] = win.getPosition();
        return { x, y };
    });

    let savedPosition = null;
    ipcMain.handle('save-window-position', (event) => {
        const [x, y] = win.getPosition();
        savedPosition = { x, y };
        return { x, y };
    });

    // Mock other IPC calls for clean widget initialization
    ipcMain.handle('get-initial-data', () => ({ tasks: [], sessions: [], rawPath: '' }));
    ipcMain.handle('get-current-path', () => '');
    ipcMain.handle('get-current-theme', () => 'charizard');
    ipcMain.handle('get-obsidian-tasks', () => []);
    ipcMain.handle('get-widget-visibility', () => true);
    ipcMain.handle('get-desktop-pinned', () => false);
    ipcMain.handle('get-always-on-top', () => true);

    await win.loadFile(path.join(__dirname, 'widget', 'widget.html'));
    await new Promise(r => setTimeout(r, 800));

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`  ✓ [PASS] ${message}`);
            passedTests++;
        } else {
            console.error(`  ✗ [FAIL] ${message}`);
        }
    }

    try {
        // Test 1: Verify Initial Window Position
        const [x0, y0] = win.getPosition();
        console.log(`\n[Test 1] Initial Window Position: (${x0}, ${y0})`);
        assert(typeof x0 === 'number' && typeof y0 === 'number', `Window position is numeric: (${x0}, ${y0})`);

        // Test 2: IPC moveWindowDelta
        console.log('\n[Test 2] Testing moveWindowDelta(+45, +30)...');
        await win.webContents.executeJavaScript(`
            window.electronAPI.moveWindowDelta(45, 30);
        `);
        const [x1, y1] = win.getPosition();
        console.log(`Position after delta: (${x1}, ${y1}) (expected: ${x0 + 45}, ${y0 + 30})`);
        assert(x1 === x0 + 45 && y1 === y0 + 30, `moveWindowDelta shifted window exactly by (+45, +30)`);

        // Test 3: IPC setWindowPosition
        console.log('\n[Test 3] Testing setWindowPosition(250, 180)...');
        await win.webContents.executeJavaScript(`
            window.electronAPI.setWindowPosition(250, 180);
        `);
        const [x2, y2] = win.getPosition();
        console.log(`Position after setWindowPosition: (${x2}, ${y2}) (expected: 250, 180)`);
        assert(x2 === 250 && y2 === 180, `setWindowPosition set position to exactly (250, 180)`);

        // Test 4: DOM Pointer Drag Simulation on #drag-handle
        console.log('\n[Test 4] Simulating DOM Pointer Drag on #drag-handle...');
        const [beforeDragX, beforeDragY] = win.getPosition();
        
        await win.webContents.executeJavaScript(`
            (async () => {
                const handle = document.getElementById('drag-handle');
                const startX = 500;
                const startY = 300;
                
                handle.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 1,
                    screenX: startX,
                    screenY: startY,
                    clientX: 100,
                    clientY: 10
                }));
                
                await new Promise(r => setTimeout(r, 50));
                
                handle.dispatchEvent(new PointerEvent('pointermove', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 1,
                    screenX: startX + 60,
                    screenY: startY + 40,
                    clientX: 160,
                    clientY: 50
                }));
                
                await new Promise(r => setTimeout(r, 50));
                
                handle.dispatchEvent(new PointerEvent('pointerup', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 1,
                    screenX: startX + 60,
                    screenY: startY + 40
                }));
            })();
        `);
        await new Promise(r => setTimeout(r, 200));

        const [afterDragX, afterDragY] = win.getPosition();
        console.log(`Position after #drag-handle drag: (${afterDragX}, ${afterDragY}) (expected: ${beforeDragX + 60}, ${beforeDragY + 40})`);
        assert(afterDragX === beforeDragX + 60 && afterDragY === beforeDragY + 40, `#drag-handle DOM drag moved window by (+60, +40)`);

        // Test 5: DOM Pointer Drag Simulation on #sprite-display
        console.log('\n[Test 5] Simulating DOM Pointer Drag on #sprite-display...');
        const [beforeSpriteX, beforeSpriteY] = win.getPosition();
        
        await win.webContents.executeJavaScript(`
            (async () => {
                const sprite = document.getElementById('sprite-display');
                const startX = 400;
                const startY = 400;
                
                sprite.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 2,
                    screenX: startX,
                    screenY: startY,
                    clientX: 50,
                    clientY: 50
                }));
                
                await new Promise(r => setTimeout(r, 50));
                
                sprite.dispatchEvent(new PointerEvent('pointermove', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 2,
                    screenX: startX - 30,
                    screenY: startY - 20,
                    clientX: 20,
                    clientY: 30
                }));
                
                await new Promise(r => setTimeout(r, 50));
                
                sprite.dispatchEvent(new PointerEvent('pointerup', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    pointerId: 2,
                    screenX: startX - 30,
                    screenY: startY - 20
                }));
            })();
        `);
        await new Promise(r => setTimeout(r, 200));

        const [afterSpriteX, afterSpriteY] = win.getPosition();
        console.log(`Position after #sprite-display drag: (${afterSpriteX}, ${afterSpriteY}) (expected: ${beforeSpriteX - 30}, ${beforeSpriteY - 20})`);
        assert(afterSpriteX === beforeSpriteX - 30 && afterSpriteY === beforeSpriteY - 20, `#sprite-display DOM drag moved window by (-30, -20)`);

        // Test 6: Verify Position Save
        console.log('\n[Test 6] Verifying saveWindowPosition was triggered on pointerup...');
        assert(savedPosition !== null && savedPosition.x === afterSpriteX && savedPosition.y === afterSpriteY, `Window position (${savedPosition ? savedPosition.x : null}, ${savedPosition ? savedPosition.y : null}) saved successfully on drag finish`);

        console.log(`\n========================================`);
        console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
        console.log(`========================================\n`);

        if (passedTests === totalTests) {
            console.log('ALL TESTS PASSED SUCCESSFULLY! Window dragging is 100% verified working.');
            win.close();
            app.quit();
            process.exit(0);
        } else {
            console.error('SOME TESTS FAILED!');
            win.close();
            app.quit();
            process.exit(1);
        }
    } catch (err) {
        console.error('[TEST ERROR]', err);
        win.close();
        app.quit();
        process.exit(1);
    }
});
