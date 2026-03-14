import { spawn } from 'node:child_process';

export async function openFolder(folderPath) {
  if (process.env.PROMPTLAB_DISABLE_OPEN === '1') {
    return { path: folderPath, skipped: true };
  }

  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    command = 'explorer.exe';
    args = [folderPath];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [folderPath];
  } else {
    command = 'xdg-open';
    args = [folderPath];
  }

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });

  return { path: folderPath, skipped: false };
}
