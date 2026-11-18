// 카카오톡 공유 (Kakao JavaScript SDK)
// 키는 client/.env 의 VITE_KAKAO_JS_KEY 에 넣는다 (카카오 디벨로퍼스 > 앱 > 앱 키 > JavaScript 키).

type KakaoSDK = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

let loadingPromise: Promise<KakaoSDK> | null = null;

export const isKakaoConfigured = () => Boolean(KAKAO_JS_KEY);

// 앱 시작 시 미리 불러둔다. 클릭 후에 비동기로 불러오면 PC에서 공유 팝업이 차단될 수 있다.
export function loadKakao(): Promise<KakaoSDK> {
  if (!KAKAO_JS_KEY) return Promise.reject(new Error('VITE_KAKAO_JS_KEY 가 설정되지 않았습니다.'));
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<KakaoSDK>((resolve, reject) => {
    const initialize = () => {
      const kakao = window.Kakao;
      if (!kakao) { reject(new Error('Kakao SDK 로드 실패')); return; }
      if (!kakao.isInitialized()) kakao.init(KAKAO_JS_KEY);
      resolve(kakao);
    };

    if (window.Kakao) { initialize(); return; }

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = initialize;
    script.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
    document.head.appendChild(script);
  }).catch((error) => {
    loadingPromise = null; // 다음 시도에서 다시 불러올 수 있게
    throw error;
  });

  return loadingPromise;
}

const getReadyKakao = () => {
  const kakao = window.Kakao;
  return kakao && kakao.isInitialized() ? kakao : null;
};

/** 텍스트 템플릿으로 카카오톡 공유. SDK가 준비되지 않았으면 false 를 돌려준다. */
export function shareKakaoText(text: string, url: string): boolean {
  const kakao = getReadyKakao();
  if (!kakao) return false;

  kakao.Share.sendDefault({
    objectType: 'text',
    text,
    link: { mobileWebUrl: url, webUrl: url },
    buttonTitle: '자세히 보기',
  });
  return true;
}
