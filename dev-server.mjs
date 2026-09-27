import { spawn } from 'child_process';

const vite = spawn('npm', ['run', 'vite'], { stdio: 'inherit', shell: true });
const python = spawn('python', ['ml/api.py'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
    vite.kill('SIGINT');
    python.kill('SIGINT');
    process.exit(0);
});
