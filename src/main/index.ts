import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerAllIpcHandlers } from './ipc'
import { setTargetDirFromArgs } from './ipc/app.ipc'

// CLI 인자에서 지정 디렉토리 추출
function parseCliArgs(): string | null {
  // electron 실행 시 argv[0]은 electron, argv[1]은 앱 경로
  // 추가 인자는 argv[2]부터
  const args = process.argv.slice(is.dev ? 2 : 1)

  // '--' 로 시작하지 않는 첫 번째 인자를 경로로 간주
  for (const arg of args) {
    if (!arg.startsWith('--') && !arg.startsWith('-')) {
      return arg
    }
  }
  return null
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 개발 모드일 때 HMR 서버에 연결, 아닌 경우 빌드된 파일 로드
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// 앱 초기화
app.whenReady().then(() => {
  // CLI 인자 처리
  const targetDir = parseCliArgs()
  if (targetDir) {
    setTargetDirFromArgs(targetDir)
  }

  // IPC 핸들러 등록
  registerAllIpcHandlers()

  // 메인 윈도우 생성
  const mainWindow = createWindow()

  // 드래그 앤 드롭으로 폴더가 전달된 경우 처리
  // macOS의 open-file 이벤트
  app.on('open-file', (_event, path) => {
    setTargetDirFromArgs(path)
    if (mainWindow) {
      mainWindow.webContents.send('app:target-dir-changed', path)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
