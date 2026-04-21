# Frontend microfrontend osnova

`frontend` trenutno vsebuje:

- `container-app`: shell aplikacija, ki nalaga remote module
- `auth-mf`: prvi remote modul za auth domeno

## Lokalni zagon

V dveh terminalih:

```bash
cd frontend/auth-mf
npm start
```

```bash
cd frontend/container-app
npm start
```

## Kako deluje

`auth-mf` registrira globalni API:

```js
window.authMf.mount(container, shellContext)
```

`container-app` nalozi remote bundle in ga mounta v svoj layout.

To je lahka development osnova za microfrontend pristop. Naslednji korak je, da po enakem vzorcu dodas se `property-mf`, `payments-mf` in skupen `shared-ui` sloj.
