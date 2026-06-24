# CACMU Dashboard (React + Proxy Seguro)

Implementacion con:
- `client/`: frontend en React (sin API key).
- `server/`: backend proxy Express (guarda API key en `.env`).

## Seguridad aplicada
La `CACMU_API_KEY` ya no se expone en el navegador.  
React llama solo al backend local, y el backend consume la API de CACMU.

## Endpoints internos del backend
- `POST /api/cacmu/preguntas-seguridad`
- `POST /api/BancaVirtual/Bloquear` (enviar solo `NumeroIdentificacion`)

## Configuracion
Archivo: `server/.env`

Variables:
- `PORT=8787`
- `CACMU_BASE_URL=https://apis.cacmu.fin.ec/WSIVRCacmu/api`
- `CACMU_API_KEY=...`

El backend envia la key hacia CACMU en el header:
- `Authorization: <CACMU_API_KEY>`

## Ejecutar
Terminal 1:
```bash
cd server
npm run dev
```

Terminal 2:
```bash
cd client
npm run dev
```

Frontend por defecto: `http://localhost:5173`  
Backend por defecto: `http://localhost:8787`




