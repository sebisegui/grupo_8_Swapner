// REQUIRES
var express = require('express');
var router = express.Router();
const path = require ('path')
const fs = require('fs');
const bcrypt = require('bcryptjs')
const session = require('express-session');
const { check, validationResult, body } = require('express-validator');
const DB = require('../database/models')
const OP = DB.Sequelize.Op






//ACCESO A DATA BASE
const usersPath = path.join(__dirname, '../database/usersDataBase.json')
const productsPath = path.join(__dirname, '../database/productsDataBase.json')
const listaProductos = fs.readFileSync(productsPath)

// VARIABLES A UTILIZAR 
let listaUsuariosJS = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
let listaProductosJS = JSON.parse(listaProductos)

// CONTROLLER
const siteController ={  
    login: (req,res) =>{
        res.render('login')
    },
    validationLogin :async (req,res) =>{
        let validation = validationResult(req);
        let errors = validation.errors;
        if( errors == ""){
         let usuario = await DB.Usuario.findOne( { where: { email: req.body.email }});
           if (usuario != undefined){
             if ( bcrypt.compareSync (req.body.password, usuario.password))
                req.session.userId = usuario.id;
                if(req.body.recordame){
                    res.cookie('userCookie',usuario.id,{maxAge:10000000})
                    
                }
                res.redirect('/products')
             }
        }
        res.render('login',{errors})
},
    logout: (req,res) =>{
        req.session.destroy()
        res.cookie('userCookie',null,{maxAge:1})
        res.redirect('/')
        },


    profile: (req,res) =>{
        let user =listaUsuariosJS.find( userToLogin => userToLogin.id == req.session.userId);
        res.render('profile',{user})

    },
    //TODOS LOS PRODUCTOS
    index: async (req, res) =>{
            let productosDeMuestra = await DB.Producto.findAll({
                limit:6},{
                include:['imagenes','likes','categorias','usuarios']
                })
            let productosNuestros = await DB.Producto.findAll({where: { usuario_id: req.session.userId}},{
                include:['imagenes','likes','categorias','usuarios']
                })
            
            let productos= await DB.Producto.findAll({
                include:{all:true}})
                
            let filtrados = productos.filter((unProd)=> unProd.likes.some((elemento)=> elemento.Like1.usuario_id == req.session.userId && elemento.Like1.me_gusta == 1))
            let filtrados2 = productos.filter((unProd1)=> unProd1.usuario_id != req.session.userId)
            let filtrados3 = filtrados2.filter((unProd2)=> unProd2.likes.some((elemento)=> elemento.Like1.usuario_id == req.session.userId && elemento.Like1.me_gusta == null  ))
            
            let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
                {include:['codPost']
            })
            
             res.render('index',{filtrados3,usuarios,productosNuestros,filtrados})
            },

    //DETALLE DE PRODUCTO CON SU ID
    detalleProduct: async (req, res) =>{
        let productosNuestros = await DB.Producto.findAll({where: { usuario_id: req.session.userId}},{
            include:['imagenes','likes','categorias','usuarios']
            })
        let productoDetalle = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        let productos = await DB.Producto.findAll({
            include:['imagenes','likes','categorias','usuarios']
        })
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        
       })
       let imagen = await DB.Imagen.findAll({ where: { prod_id: req.params.id } },
        {include:['productos']
       })
       let filtrados = productos.filter((unProd)=> unProd.likes.some((elemento)=> elemento.Like1.usuario_id == req.session.userId && elemento.Like1.me_gusta == 1))

        res.render('detalle',{productoDetalle, productos,usuarios,imagen, filtrados,productosNuestros})
       },
        
        
    
    //FORMULARIO DE CARGA DE PRODUCTO
    cargaProduct: async (req, res) =>{
        let categorias =  await DB.Categoria.findAll()
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        })
        res.render('formulario-carga',{categorias,usuarios})
    },

    //EDITAR UN PRODUCTO CON SU ID
    edit: async (req,res,next) =>{
        let usuarios = await DB.Usuario.findOne( {where: { id: req.session.userId}},
            {include:['codPost']
        })
        let categorias =  await DB.Categoria.findAll()
        let producto = await DB.Producto.findByPk(req.params.id,{
            include:['imagenes','likes','categorias','usuarios']
        })
        let imagen = await DB.Imagen.findAll({ where: { prod_id: req.params.id } },
            {include:['productos']
        })
        res.render('edit-form', {producto,imagen,categorias,usuarios})
    },

    //CARGAR UN PRODUCTO EN LA BASE DE DATOS
      store: async (req,res) =>{
          let producto = {
            nombre: req.body.nombre,
            categoria: req.body.categoria,
            descripcion : req.body.descripcion,
            precio : req.body.precio,
            usuario_id: req.session.userId,
            foto_portada : req.files[0].filename
          } 
          try{
              await DB.Producto.create(producto)
              res.redirect('/products')
          }
          catch (error){
              res.send ('error')
          }
      },
    
    
        
    //ACTUALIZAR PRODUCTO
    update: async (req,res) =>{
        DB.Producto.update({
            nombre: req.body.nombre,
            categoria: req.body.categoria,
            precio: req.body.precio,
            descripcion: req.body.descripcion,
            foto_portada: req.files.filename,
            usuario_id: req.session.userId
        },{
            where:{
                id:req.params.id
            }
            })

            res.redirect('/products/')          
    }, 
         
    //ELIMINAR PRODUCTO 
    delete: (req,res) => { 
        DB.Producto.destroy({
            where:{
                id:req.params.id
            }
        })
        
             res.redirect('/products/')
    },
    //FORMULARIO DE REGISTRO
    register: (req,res) =>{
        res.render('register')
    },
    //GUARDAR UN USUARIO EN BASE DE DATOS

    //Metodo para guardar un Usuario al momento de Registrarse, modificando la DB
    userStore:async (req,res) =>{
        let usuarioNuevo ={
            nombre: req.body.nombre,
            telefono: req.body.telefono,
            username : req.body.username,
            email : req.body.email,
            localidad: req.body.localidad,
            //Contraseña encriptada con BCRYPT
            password: bcrypt.hashSync(req.body.contraseña),
            avatar : req.files[0].filename,
        } 
        try{
            await DB.Usuario.create(usuarioNuevo)
            res.redirect('/')
        }
        catch (error){
            console.log (error)
            res.send (error.message)
        }
    },

        likes:async (req,res) =>{
           await DB.Like1.update({
               me_gusta: req.body.me_gusta
            },
            {
                where:{
                    usuario_id: req.session.userId,
                    producto_id:req.params.id
                }
            })
                res.redirect('/products')
    
},
}

module.exports = siteController