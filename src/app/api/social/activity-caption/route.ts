import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const captionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        caption: {
            type: Type.STRING,
            description: "The generated fun, engaging, and brief caption for the friend feed in Costa Rican Spanish."
        },
        emoji: {
            type: Type.STRING,
            description: "A single representative emoji for the order (e.g. 🍣, 🍔)."
        }
    },
    required: ["caption", "emoji"]
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userName, items = [], restaurantName } = body;

        if (!userName || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const itemsDesc = items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');

        if (!process.env.GEMINI_API_KEY) {
            // Mock response if no key is present for local development
            return NextResponse.json({
                caption: `¡${userName} no se pudo resistir y pidió ${itemsDesc} de ${restaurantName || 'su lugar favorito'}! Mae, qué antojo.`,
                emoji: "🤤"
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
Eres un asistente experto en redes sociales para la app de comida "FastEat" en Costa Rica.
Tu tarea es generar un "caption" (texto corto y divertido) para el feed social de la app, anunciando lo que acaba de pedir un usuario.

El tono debe ser:
- Amigable y entusiasta (usa modismos de Costa Rica suavemente como "mae", "tuanis", "al chile", "antojo", pero sin exagerar).
- Muy corto (máximo 1 o 2 oraciones, perfecto para un feed móvil rápido).
- Enfocado en antojar a los demás amigos.

Datos de la orden:
Nombre del usuario: ${userName}
Restaurante: ${restaurantName || 'un restaurante de la app'}
Artículos pedidos: ${itemsDesc}

Genera el caption y un emoji principal que represente la orden.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: captionSchema,
            }
        });

        if (!response.text) {
            throw new Error('No text returned from Gemini');
        }

        let resultObject;
        try {
            resultObject = JSON.parse(response.text);
        } catch (parseError) {
            console.warn('[social.activity-caption.parse-error]', {
                error: parseError,
                responseText: response.text.slice(0, 300)
            });
            return NextResponse.json({ error: 'Invalid provider payload' }, { status: 502 });
        }

        return NextResponse.json({
            caption: resultObject.caption,
            emoji: resultObject.emoji
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
