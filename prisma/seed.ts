import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Usuarios actuales del sistema - CORREGIDO con role_type
const loginUsers = [
  { username: 'admin', password: 'admin123', roleType: 'super_admin', path:'/selector' }, // SUPER ADMIN
  { username: 'evolve', password: 'evolve123', roleType: 'super_admin', path:'/selector' }, // SUPER ADMIN BACKUP
  { username: 'lisit', password: 'lisit123', roleType: 'admin', path:'/chatbot/lisa', gcpName: 'lisit', chatbotName: 'Lisa AI' }, // CAMBIADO A ADMIN
  { username: 'cintac', password: 'cintac123', roleType: 'admin', path:'/admin-client', gcpName: 'cintac', chatbotName: 'Cintac Assistant' }, // CLIENTE ADMIN
  { username: 'mecanic', password: 'mecanic123', roleType: 'admin', path:'/admin-client', gcpName: 'mecanic', chatbotName: 'Mecanic Helper' }, // CLIENTE ADMIN
  { username: 'restobar', password: 'restobar123', roleType: 'admin', path:'/chatbot/chatbotID9292', gcpName: 'restobar', chatbotName: 'Restobar Bot' }, // CAMBIADO A ADMIN
  { username: 'minddash', password: 'minddash123', roleType: 'admin', path:'/chatbot/chatbotID3434', gcpName: 'mindDash', chatbotName: 'MindDash Analytics' }, // CAMBIADO A ADMIN
];

// Mapeo de clientes
const clientsData = [
  { id: uuidv4(), nombre: 'Evolve Admin', descripcion: 'Empresa administrativa del sistema', updated_at: new Date() },
  { id: uuidv4(), nombre: 'Evolve Backup', descripcion: 'Usuario super admin de respaldo', updated_at: new Date() },
  { id: uuidv4(), nombre: 'LISIT', descripcion: 'Empresa de análisis de datos', updated_at: new Date() },
  { id: uuidv4(), nombre: 'Cintac', descripcion: 'Empresa de construcción con sistema Metalcon', updated_at: new Date() },
  { id: uuidv4(), nombre: 'Mecánica Express', descripcion: 'Taller mecánico especializado', updated_at: new Date() },
  { id: uuidv4(), nombre: 'Restobar Central', descripcion: 'Restaurante y bar', updated_at: new Date() },
  { id: uuidv4(), nombre: 'MindDash Analytics', descripcion: 'Plataforma de análisis empresarial', updated_at: new Date() },
];

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // 1. Crear clientes
    console.log('📊 Creando clientes...');
    const clients: any[] = [];
    for (const clientData of clientsData) {
      const client = await prisma.clients.upsert({
        where: { id: clientData.id },
        update: clientData,
        create: clientData,
      });
      clients.push(client);
      console.log(`✅ Cliente creado: ${client.nombre}`);
    }

    // 2. Crear usuarios
    console.log('👥 Creando usuarios...');
    for (let i = 0; i < loginUsers.length; i++) {
      const user = loginUsers[i];
      const client = clients[i]; // Cada usuario con su cliente correspondiente
      
      // Generar email basado en username
      const email = `${user.username}@${client.nombre.toLowerCase().replace(/\s+/g, '')}.com`;
      
      // Hashear password
      const passwordHash = await hashPassword(user.password);
      
      const userData = {
        id: uuidv4(),
        username: user.username,
        email: email,
        password_hash: passwordHash,
        email_verified: true, // Los usuarios existentes se consideran verificados
        is_active: true,
        updated_at: new Date(),
      };

      const newUser = await prisma.users.upsert({
        where: { username: user.username },
        update: {
          email: userData.email,
          password_hash: userData.password_hash,
          email_verified: userData.email_verified,
          is_active: userData.is_active,
          updated_at: userData.updated_at,
        },
        create: userData,
      });

      console.log(`✅ Usuario creado: ${newUser.username} - ${client.nombre}`);
    }

    // 3. Crear productos (chatbots) para usuarios que los tienen
    console.log('🤖 Creando productos (chatbots)...');
    const usersWithChatbots = loginUsers.filter(user => user.chatbotName);
    
    for (let i = 0; i < usersWithChatbots.length; i++) {
      const user = usersWithChatbots[i];
      const client = clients[loginUsers.findIndex(u => u.username === user.username)];
      
      const productData = {
         id: uuidv4(),
         name: user.chatbotName!,
         description: `Chatbot inteligente para ${client.nombre}`,
         tipo: 'chatbot',
         project_id: client.id, // Usar project_id en lugar de client_id
         welcome_message: `¡Hola! Soy ${user.chatbotName}, tu asistente virtual. ¿En qué puedo ayudarte hoy?`,
         max_users: 100,
         is_active: true,
         config: { chatbot_url: user.path, gcp_name: user.gcpName },
         mensajes_mes: 0
       };

      const newProduct = await prisma.products.upsert({
        where: { id: productData.id },
        update: productData,
        create: {
          ...productData,
          updated_at: new Date()
        },
      });

      console.log(`✅ Producto creado: ${newProduct.name} para ${client.nombre}`);
    }

    console.log('🎉 Seed completado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`- ${clients.length} clientes creados`);
    console.log(`- ${loginUsers.length} usuarios migrados`);
    console.log(`- ${usersWithChatbots.length} productos (chatbots) creados`);
    console.log('\n🔑 Credenciales de acceso:');
    
    for (const user of loginUsers) {
      console.log(`- Usuario: ${user.username} | Password: ${user.password} | Rol: ${user.roleType}`);
    }

  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });