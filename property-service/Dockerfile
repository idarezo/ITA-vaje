# 1. Izberi uradno Node.js LTS osnovno sliko
FROM node:20-alpine

# 2. Nastavi delovni direktorij znotraj kontejnerja
WORKDIR /app

# 3. Kopiraj package.json in package-lock.json (če obstaja)
COPY package*.json ./

# 4. Namesti npm odvisnosti
RUN npm install 

# 5. Kopiraj vse preostale datoteke v kontejner
COPY . .

# 6. Izpostavi port (naj bo enak kot v tvoji aplikaciji)
EXPOSE 3002

# 7. Definiraj ukaz za zagon aplikacije
CMD ["node", "property-service.js"]
