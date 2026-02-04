
import { MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  // Entradas
  {
    id: 'e1',
    name: 'Gyoza de Cerdo',
    description: 'Empanadillas japonesas artesanales rellenas de cerdo y verduras, servidas con salsa ponzu.',
    price: 8.50,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1591814448473-7057b79e5e11?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'e2',
    name: 'Edamame al Vapor',
    description: 'Vainas de soja tiernas con escamas de sal marina de Okinawa.',
    price: 5.00,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'e3',
    name: 'Takoyaki',
    description: 'Bolitas de masa rellenas de pulpo, cubiertas con salsa takoyaki y katsuobushi.',
    price: 9.00,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&q=80&w=800'
  },
  // Platos Fuertes
  {
    id: 'p1',
    name: 'Ramen Tonkotsu Klasik',
    description: 'Caldo cremoso de cerdo durante 12 horas, chashu, huevo marinado y fideos frescos.',
    price: 16.50,
    category: 'Platos Fuertes',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'p2',
    name: 'Tokio Sushi Platter',
    description: 'Selección premium de 12 piezas de nigiri y rolls tradicionales.',
    price: 24.00,
    category: 'Platos Fuertes',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'p3',
    name: 'Katsu Curry',
    description: 'Chuleta de cerdo empanizada en panko servida con curry japonés tradicional y arroz.',
    price: 18.00,
    category: 'Platos Fuertes',
    image: 'https://images.unsplash.com/photo-1598511757337-fe2af93436f4?auto=format&fit=crop&q=80&w=800'
  },
  // Bebidas
  {
    id: 'b1',
    name: 'Sake Junmai Ginjo',
    description: 'Sake premium con notas frutales y un acabado limpio.',
    price: 12.00,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1612933758362-e93540f2524a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'b2',
    name: 'Té de Cebada Mugicha',
    description: 'Té refrescante de cebada tostada, ideal para acompañar el sushi.',
    price: 3.50,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&q=80&w=800'
  },
  // Cafés
  {
    id: 'c1',
    name: 'Matcha Latte',
    description: 'Té verde matcha de grado ceremonial con leche de avena vaporizada.',
    price: 5.50,
    category: 'Cafés',
    image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c2',
    name: 'Café de Sifón Japonés',
    description: 'Café de especialidad preparado artesanalmente mediante el método de sifón.',
    price: 6.50,
    category: 'Cafés',
    image: 'https://images.unsplash.com/photo-1544787210-2211d6e866bc?auto=format&fit=crop&q=80&w=800'
  }
];
