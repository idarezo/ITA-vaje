# GitHub Actions - CI/CD Pipeline

## Pregled

Projekt je integriran s GitHub Actions za avtomatsko izvajanje testov ob vsakem push-u.

## Workflow konfiguracija

**Lokacija**: `.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm install (root)
      - run: cd property-service && npm install
      - run: cd property-service && npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

## Kako deluje

### Sprožilci (Triggers)

Workflow se avtomatično zažene ob:

1. **Push na主 veje**:
   - `main`
   - `master`
   - `develop`

2. **Pull Requests** na navedene veje

### Koraki izvajanja

1. **Checkout**: Prevzame kodo iz Git repozitorija
2. **Setup Node.js**: Namesti Node.js verzijo 20
3. **Install dependencies**: Namesti npm pakete
4. **Run tests**: Zažene vse teste s pokritostjo
5. **Upload coverage**: Pošlje pokritost na Codecov

## Postavljanje na GitHub

### 1. Preveri da `test.yml` obstaja

```bash
ls .github/workflows/
# Izhod: test.yml
```

### 2. Commit in Push

```bash
git add .github/workflows/test.yml
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```

### 3. Preveri Actions statusе

V GitHub spletnem vmesniku:

- Pojdi na **Actions** zavihek
- Videj "Run Tests" workflow
- Klikni na zadnji push
- Preveri status

## Status badge

Dodaj badge v README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)
```

## PR Check

Ko odpreš Pull Request:

- Workflow se avtomatski zažene
- Prikaže se status testiranja
- Merge je mogoč samo če so testi uspešni (opcijsko)

## Konfiguracija Branch Protection (opcijsko)

1. Pojdi do **Settings** → **Branches**
2. Izberi brancho (npr. `main`)
3. Klikni **Add rule**
4. Preklopi to **Require status checks to pass before merging**
5. Izberi "Run Tests" workflow

## Debugging GitHub Actions

### Prikaži loge

1. Pojdi na Actions zavihek
2. Klikni na zadnji workflow run
3. Ekspandira korake za podrobne loge

### Re-run workflow

```bash
# V GitHub UI
# Klikni na "Re-run all jobs"
```

### Lokalni test pred push-om

```bash
# Testiraj lokalno
cd property-service
npm test

# Če so testi uspešni, push
git push
```

## Časovne časovnice

Workflow se ponavadi zaključi v:

- ✅ **2-3 minute** za normalen run
- ⏱️ **5+ minut** za prvi run (ko se instalirajo odvisnosti)

## Troubleshooting

### Workflow ne teče

**Problem**: Workflow se ne zaganja ob push-u

**Rešitev**:

```bash
# Preveri da .github/workflows/test.yml obstaja
git ls-files | grep ".github"

# Commit in push
git add .github/
git push
```

### Node.js verzija ni kompatibilna

**Problem**: Teste napake "Module not found"

**Rešitev**: Preveri verzijo v `jest.config.js` in `package.json`

### Testi se timeout-ajo

**Rešitev** v `.github/workflows/test.yml`:

```yaml
- run: cd property-service && npm test -- --coverage --testTimeout=15000
```

## Naslednji koraki

### 1. CodeCov integracija

Pokritost se pošlje na [codecov.io](https://codecov.io):

```bash
# Registriraj se z GitHub kontom
# Omogoči codecov za repo
```

### 2. Branch protection

Zahtevaj, da so testi uspešni pred merge-om:

```
Settings → Branches → Branch protection rule → Require status checks
```

### 3. Dodatne akcije

Ker dodaş:

- **SonarQube** za analizacijo kode
- **SECURITY-SCAN** za varnostne testi
- **PERFORMANCE-TEST** s k6

## Primer uspešnega workflow-a

```
✅ Run Tests
├─ 🛒 Checkout
├─ 🔧 Setup Node.js 20
├─ 📦 Install root dependencies
├─ 📦 Install property-service dependencies
├─ ✅ Run tests (4 minutes)
│  ├─ ✅ API Tests (10/10 passed)
│  ├─ ✅ DB Tests (6/6 passed)
│  ├─ ✅ Logger Tests (10/10 passed)
│  └─ 📊 Coverage: 82.5%
└─ 📤 Upload coverage
```

## Konfiguracija za matlike razvojne veje

```yaml
# Testiranje samo na develop
on:
  push:
    branches: [develop]

# Testiranje na pull requests
on:
  pull_request:
    branches: [main, master, develop]
```

## Simetrija z lokalnim testiranjem

Lokalno:

```bash
npm test -- --coverage
```

V GitHub Actions:

```yaml
run: cd property-service && npm test -- --coverage
```

Enaka команда = Konzisten rezultat

## Reference

- [GitHub Actions dokumentacija](https://docs.github.com/en/actions)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)
