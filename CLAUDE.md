# El Espinal Mobile — App para operadores

## Descripción
App mobile para operadores de El Espinal (empresa de maquinaria pesada).
Complementa la app web (el-espinal.vercel.app).
Construida con Expo + React Native + TypeScript.

## Stack
- Expo SDK (latest) con TypeScript
- React Navigation para navegación
- Supabase para auth y base de datos
- expo-secure-store para guardar sesión de forma segura
- expo-image-picker para fotos de facturas

## Backend
- Misma base de datos Supabase que la app web
- URL: (agregar EXPO_PUBLIC_SUPABASE_URL en .env)
- Mismos roles: admin y operador

## Funcionalidades a construir
1. Login con email y contraseña
2. Pantalla principal con dos acciones: Reportar horómetro y Registrar combustible
3. Formulario de horómetro: selector máquina, fecha, lectura, notas
4. Formulario de combustible: tipo (carga/descarga), estanque, máquina, litros, foto factura
5. Historial de reportes del operador (últimos 7 días)

## Usuarios objetivo
Operadores en terreno — interfaz simple, campos grandes, uso con una mano

## Convenciones
- Español para textos de UI
- Componentes en /components
- Lógica de Supabase en /lib
- Pantallas en /screens
- Colores corporativos: verde #1D9E75, blanco, gris oscuro
