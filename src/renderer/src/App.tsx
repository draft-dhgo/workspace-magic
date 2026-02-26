import { useEffect } from 'react'
import { useAppStore } from './stores/app.store'
import { Navigation } from './components/Navigation'
import { MainPage } from './pages/MainPage'
import { ResourcePage } from './pages/ResourcePage'
import { ComposePage } from './pages/ComposePage'

function App(): JSX.Element {
  const { currentPage, gitInstalled, errorMessage, checkGitInstalled, loadTargetDir } =
    useAppStore()

  useEffect(() => {
    checkGitInstalled()
    loadTargetDir()

    // macOS open-file 이벤트로 전달된 경로 수신
    window.api.app.onTargetDirChanged((dir: string) => {
      useAppStore.getState().setTargetDir(dir)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <Navigation />

      {/* git 미설치 경고 */}
      {!gitInstalled && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20">
          git이 설치되어 있지 않습니다. git을 설치한 후 앱을 다시 시작해주세요.
        </div>
      )}

      {/* 에러 메시지 */}
      {errorMessage && gitInstalled && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => useAppStore.getState().setErrorMessage(null)}
            className="ml-2 text-destructive hover:text-destructive/80 font-bold"
          >
            X
          </button>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        {currentPage === 'main' && <MainPage />}
        {currentPage === 'resource' && <ResourcePage />}
        {currentPage === 'compose' && <ComposePage />}
      </main>
    </div>
  )
}

export default App
