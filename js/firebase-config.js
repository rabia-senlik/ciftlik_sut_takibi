// ============================================================================
// FIREBASE YAPILANDIRMASI (FIREBASE CONFIGURATION)
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCzXBTF6T2tO713cSGq4ew0erjTiplDnO0",
  authDomain: "ciftliksut-d6398.firebaseapp.com",
  projectId: "ciftliksut-d6398",
  storageBucket: "ciftliksut-d6398.firebasestorage.app",
  messagingSenderId: "288263218516",
  appId: "1:288263218516:web:8cc25a85724fc7b37f94c1",
  measurementId: "G-YZGKSJ6RG6"
};

// Yapılandırmanın doldurulup doldurulmadığını kontrol eden yardımcı fonksiyon
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "BURAYA_API_KEY_YAZIN" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "PROJE-ID"
  );
}
