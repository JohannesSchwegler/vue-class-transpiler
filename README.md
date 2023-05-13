# Transpile your Vue class component to script setup

Just a small tool that helps with migrating vue class components to script setup.
Not every syntax transformation is supported yet (e.g. Watcher Decorators, WatchSync ...), so DON'T expect the code to be sematically 100% correct.
The aim is to avoid the repetitive syntax adaptations in order to be able to concentrate more on the sematics of the code.

- 💪 Vue 2 Class Components - > Vue 3 Setup API
- 🔥 Written in TypeScript
- 🛠️ Uses babel to transform the code

[Test it here](https://vue-class-to-script-setup-transpiler.johannesschwegler.com/)

<p align="center">
  <img width="700px" src="https://vue-class-to-script-setup-transpiler.johannesschwegler.com/preview.png">
</p>
