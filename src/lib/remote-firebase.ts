// Sauvegarde du site seul (GitHub Pages) : Firebase, avec le compte du Cockpit de révision (même projet, même
// e-mail et mot de passe). Chargé seulement quand on se sert de la sauvegarde en ligne. Firebase ne reçoit que du
// chiffré (voir vault.ts), rangé dans capsup/<identifiant du compte>.
import { FirebaseError, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, createUserWithEmailAndPassword, initializeAuth, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, type User
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore/lite';
import { RemoteError, type Remote } from './remote';
import { isEnvelope } from './vault';

const CONFIG = {
  apiKey: 'AIzaSyCAnCsKsnySIvIHcv7edkSqxoIHyhULXsQ',
  authDomain: 'cockpit-revision-44fa9.firebaseapp.com',
  projectId: 'cockpit-revision-44fa9',
  storageBucket: 'cockpit-revision-44fa9.firebasestorage.app',
  messagingSenderId: '277838332278',
  appId: '1:277838332278:web:c6542c717b41b08bc8fa57'
};

const fb = initializeApp(CONFIG, 'cap-sup');
const auth = initializeAuth(fb, { persistence: browserLocalPersistence });
const db = getFirestore(fb);

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : utilise « Se connecter ».',
  'auth/weak-password': 'Mot de passe trop court : 6 caractères minimum.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/missing-password': 'Écris ton mot de passe.',
  'auth/missing-email': 'Écris ton e-mail.',
  'auth/too-many-requests': 'Trop d’essais d’affilée : attends quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion internet : tes réponses restent sur cet appareil.',
  'auth/operation-not-allowed': 'La connexion par e-mail n’est pas activée dans Firebase.',
  unavailable: 'Pas de connexion internet : tes réponses restent sur cet appareil.',
  'deadline-exceeded': 'Pas de connexion internet : tes réponses restent sur cet appareil.',
  'permission-denied': 'Firebase refuse l’accès à la sauvegarde de Cap Sup : ses règles de sécurité doivent l’autoriser (voir le README).'
};

function toRemoteError(e: unknown): RemoteError {
  const code = e instanceof FirebaseError ? e.code : '';
  const offline = code === 'auth/network-request-failed' || code === 'unavailable' || code === 'deadline-exceeded';
  return new RemoteError(MESSAGES[code] ?? `Erreur de Firebase (${code || 'inconnue'}).`, offline);
}

async function guard<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    throw toRemoteError(e);
  }
}

function remoteFor(u: User): Remote {
  const ref = doc(db, 'capsup', u.uid);
  return {
    id: u.uid,
    account: u.email ?? 'ton compte',
    async load() {
      const snap = await guard(getDoc(ref));
      const d = snap.exists() ? snap.data() : null;
      return isEnvelope(d) ? d : null;
    },
    save: (e) => guard(setDoc(ref, { ...e })),
    remove: () => guard(deleteDoc(ref))
  };
}

/** Prévient à chaque connexion ou déconnexion (y compris la session retrouvée au chargement). */
export const watch = (cb: (r: Remote | null) => void): void => {
  onAuthStateChanged(auth, (u) => cb(u ? remoteFor(u) : null));
};
export const signIn = async (email: string, pass: string): Promise<void> => {
  await guard(signInWithEmailAndPassword(auth, email, pass));
};
export const signUp = async (email: string, pass: string): Promise<void> => {
  await guard(createUserWithEmailAndPassword(auth, email, pass));
};
export const resetPassword = (email: string): Promise<void> => guard(sendPasswordResetEmail(auth, email));
export const logOut = (): Promise<void> => guard(signOut(auth));
