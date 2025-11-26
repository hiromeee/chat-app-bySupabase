'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/40 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              </span>
              アプリの使い方
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-8">
              
              {/* Section 1: AI Assistant */}
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      AIチャット (Gemini)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-9">
                      メッセージに <code className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">@ai</code> を含めて送信すると、AI (Gemini) が自動的に応答します。
                  </p>
              </div>

              {/* Section 2: Channels & DMs */}
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      チャンネル & ダイレクトメッセージ
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-9">
                      サイドバーの <span className="font-bold text-slate-800 dark:text-slate-200">+</span> ボタンから新しいルームを作成できます。
                      「Direct Messages」リストのユーザーをクリックすると、1対1のチャットを開始できます。
                  </p>
              </div>

              {/* Section 3: Markdown Support */}
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      リッチテキスト & コード
                  </h4>
                  <div className="pl-9 space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        メッセージは <strong>マークダウン記法</strong> に対応しています。
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>**太字** で <strong>太字</strong></li>
                        <li>*斜体* で <em>斜体</em></li>
                        <li>`コード` で <code className="bg-slate-100 px-1 py-0.5 rounded text-xs dark:bg-slate-800">インラインコード</code></li>
                        <li>```言語名 でコードブロック</li>
                    </ul>
                  </div>
              </div>

              {/* Section 4: Keyboard Shortcuts */}
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      ショートカット
                  </h4>
                  <div className="pl-9 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-sans text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">Enter</kbd>
                          <span>送信</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-sans text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">Shift + Enter</kbd>
                          <span>改行</span>
                      </div>
                  </div>
              </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 p-4 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                  閉じる
              </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
        title="ヘルプ & 情報"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  )
}
