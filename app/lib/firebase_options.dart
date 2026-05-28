import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyCYFrKFYzqUdz40O274C1Ne7OefvjT_5uI',
    appId: '1:129260633215:web:d239b4ad4c73efe32a134a',
    messagingSenderId: '129260633215',
    projectId: 'quickaid-aecc4',
    authDomain: 'quickaid-aecc4.firebaseapp.com',
    storageBucket: 'quickaid-aecc4.firebasestorage.app',
    measurementId: 'G-R0DX4CB4Q0',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCYFrKFYzqUdz40O274C1Ne7OefvjT_5uI',
    appId: '1:129260633215:android:1234567890abcdef', // Placeholder for Android if needed
    messagingSenderId: '129260633215',
    projectId: 'quickaid-aecc4',
    storageBucket: 'quickaid-aecc4.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCYFrKFYzqUdz40O274C1Ne7OefvjT_5uI',
    appId: '1:129260633215:ios:1234567890abcdef', // Placeholder
    messagingSenderId: '129260633215',
    projectId: 'quickaid-aecc4',
    storageBucket: 'quickaid-aecc4.firebasestorage.app',
    iosBundleId: 'com.example.quickaid',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyCYFrKFYzqUdz40O274C1Ne7OefvjT_5uI',
    appId: '1:129260633215:ios:1234567890abcdef', // Placeholder
    messagingSenderId: '129260633215',
    projectId: 'quickaid-aecc4',
    storageBucket: 'quickaid-aecc4.firebasestorage.app',
    iosBundleId: 'com.example.quickaid',
  );
}
