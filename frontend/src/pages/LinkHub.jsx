import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import { Copy, Check, Trash2, Plus, ExternalLink, ChevronUp, ChevronDown, Upload, AlignLeft, AlignCenter, AlignRight, ChevronRight, ArrowRight, ArrowUpRight, MoveRight } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

var FONTS = ['DM Sans','Sora','Inter','Poppins','Playfair Display','Space Grotesk','Nunito','Raleway',
  'Montserrat','Lato','Roboto','Open Sans','Oswald','Merriweather','Outfit','Quicksand','Rubik',
  'Barlow','Josefin Sans','Abril Fatface','Bebas Neue','Comfortaa','Righteous','Pacifico',
  'Manrope','Plus Jakarta Sans','Clash Display','Satoshi','General Sans','Cabinet Grotesk',
  'Bricolage Grotesque','Instrument Sans','Geist','Figtree','Onest'];

// Icon system — categorised with SVG social icons + emoji fallbacks
var ICON_CATEGORIES = [
  { label: 'Social Media', icons: [
    { id:'instagram', label:'Instagram', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' },
    { id:'tiktok', label:'TikTok', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>' },
    { id:'youtube', label:'YouTube', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { id:'facebook', label:'Facebook', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
    { id:'twitter', label:'X / Twitter', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { id:'linkedin', label:'LinkedIn', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
    { id:'snapchat', label:'Snapchat', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.317 4.184l-.004.033c-.024.297.285.535.642.535.156-.002.33-.061.487-.18.67-.5 1.32-.5 1.47-.5.45 0 .968.432.97.986-.003.676-.537 1.032-1.045 1.186-.09.026-.19.048-.29.073-1.26.295-1.737 1.02-1.737 1.02 0 .178.043.298.098.438.317.817 1.108 2.386 1.1 4.08-.012 1.752-.712 2.908-1.706 3.738-1.135.95-2.89 1.576-4.938 1.576-.89 0-1.77-.14-2.55-.42-.77.28-1.65.42-2.54.42-2.05 0-3.81-.626-4.94-1.576-.995-.83-1.695-1.986-1.707-3.738-.008-1.694.783-3.263 1.1-4.08.055-.14.098-.26.098-.438 0 0-.476-.725-1.737-1.02-.1-.025-.2-.047-.29-.073C3.527 11.02 3 10.67 2.997 9.995c.002-.554.52-.986.97-.986.15 0 .8 0 1.47.5.157.12.33.18.488.18.357 0 .666-.238.641-.535l-.004-.033c-.086-.965-.212-2.99.317-4.184C8.446 1.069 11.803.793 12.206.793z"/></svg>' },
    { id:'pinterest', label:'Pinterest', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>' },
    { id:'whatsapp', label:'WhatsApp', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' },
    { id:'telegram', label:'Telegram', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' },
  ]},
  { label: 'Music & Content', icons: [
    { id:'spotify', label:'Spotify', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>' },
    { id:'applemusic', label:'Apple Music', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a4.93 4.93 0 00-.35 1.822c-.017.26-.02.52-.02.78V18.19c0 .26.002.52.016.78.047.84.166 1.67.506 2.45.67 1.57 1.86 2.56 3.47 3.03.55.16 1.11.24 1.68.27.41.02.82.03 1.22.03h11.75c.41 0 .82-.01 1.23-.04.59-.03 1.18-.11 1.74-.3 1.55-.52 2.72-1.49 3.4-3.01.35-.77.47-1.6.52-2.44.01-.27.02-.55.02-.82 0-.39.01-11.47 0-11.87zm-6.8 5.9c-.26 1.44-1.48 2.52-2.93 2.61-.42.03-.87-.02-1.26-.2a2.03 2.03 0 01-.62-.43 2.09 2.09 0 01-.56-1.44c0-.26.04-.52.12-.77.28-.87 1.05-1.47 1.96-1.6.27-.04.55-.03.82.01l.14.03V7.4l-5.3 1.24v6.36c-.26 1.44-1.48 2.52-2.94 2.61-.42.03-.87-.02-1.26-.2a2.04 2.04 0 01-1.18-1.87c0-.26.04-.52.12-.77.28-.87 1.05-1.47 1.96-1.6.27-.04.55-.03.82.01l.14.03V9.74l7.74-1.81v6.07z"/></svg>' },
    { id:'soundcloud', label:'SoundCloud', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.015 0-.023.01-.023.025l-.319 2.018.319 2.006c0 .015.008.025.023.025.016 0 .024-.01.024-.025l.363-2.006-.363-2.018c0-.015-.008-.025-.024-.025zm.87-.474c-.02 0-.03.014-.03.03l-.274 2.462.274 2.448c0 .016.01.03.03.03.02 0 .03-.014.03-.03l.312-2.448-.312-2.462c0-.016-.01-.03-.03-.03zm.908-.364c-.025 0-.045.02-.045.044l-.237 2.826.237 2.812c0 .024.02.044.045.044.025 0 .044-.02.044-.044l.27-2.812-.27-2.826c0-.024-.02-.044-.044-.044zm.914-.218c-.03 0-.054.024-.054.054l-.2 3.044.2 3.025c0 .03.024.054.054.054.03 0 .054-.024.054-.054l.227-3.025-.227-3.044c0-.03-.024-.054-.054-.054zm.918-.092c-.034 0-.062.028-.062.062l-.163 3.136.163 3.109c0 .034.028.062.062.062.034 0 .062-.028.062-.062l.186-3.109-.186-3.136c0-.034-.028-.062-.062-.062zm.923-.03c-.04 0-.07.03-.07.07l-.127 3.166.127 3.13c0 .04.03.07.07.07.04 0 .07-.03.07-.07l.144-3.13-.144-3.166c0-.04-.03-.07-.07-.07zM7.66 11c-.044 0-.08.035-.08.08l-.09 3.195.09 3.15c0 .044.036.08.08.08.044 0 .08-.036.08-.08l.103-3.15-.103-3.195c0-.044-.036-.08-.08-.08zm.92-.1c-.05 0-.09.04-.09.09l-.053 3.285.053 3.225c0 .05.04.09.09.09.05 0 .09-.04.09-.09l.06-3.225-.06-3.285c0-.05-.04-.09-.09-.09zm.923.058c-.054 0-.098.044-.098.098l-.016 3.219.016 3.162c0 .054.044.098.098.098.054 0 .098-.044.098-.098l.018-3.162-.018-3.219c0-.054-.044-.098-.098-.098zm.923-.295c-.06 0-.11.05-.11.11l.019 3.417-.019 3.337c0 .06.05.11.11.11.06 0 .11-.05.11-.11l.022-3.337-.022-3.417c0-.06-.05-.11-.11-.11zm3.69 1.408c-.09-.826-.737-1.47-1.537-1.47-.3 0-.578.09-.815.242-.095-.817-.76-1.452-1.57-1.452-.24 0-.467.055-.668.153v8.46c0 .093.075.168.167.168h5.99c.37 0 .67-.3.67-.67 0-.37-.3-.67-.67-.67-.037 0-.073.003-.108.009.034-.123.052-.252.052-.385 0-.778-.54-1.43-1.26-1.572.008-.077.012-.155.012-.234 0-.947-.655-1.74-1.527-1.927 0-.003.001-.005.001-.008z"/></svg>' },
    { id:'twitch', label:'Twitch', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>' },
    { id:'patreon', label:'Patreon', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.445-5.577-3.053 0-5.442 2.511-5.446 5.577-.003 3.06 2.387 5.573 5.446 5.573 3.057 0 5.449-2.513 5.445-5.573zM1.043 24h4.01V0h-4.01z"/></svg>' },
  ]},
  { label: 'Shopping & Business', icons: [
    { id:'shopify', label:'Shopify', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.337.893c-.047.028-.384.112-.768.196-.028 0-.14-.42-.252-.7-.364-.924-.924-1.4-1.624-1.4h-.084c-.196-.252-.448-.364-.672-.364-1.68 0-2.492 2.1-2.744 3.164-.672.196-1.344.42-1.848.56-.028 0-.028 0-.056.028-.56.168-.588.196-.644.728-.028.42-1.68 12.936-1.68 12.936L14.693 18l4.2-1.064S15.449.921 15.337.893zm-3.164.756c0 .056 0 .084-.028.112-.616.196-1.288.392-1.932.588.196-.756.56-1.484.98-1.848.168.336.364.812.364 1.148zm-1.4-.952c.28 0 .504.084.7.224-.392.392-.784 1.036-.98 1.848-.476.14-.952.28-1.4.42C9.265 1.845 9.993.697 10.773.697zm-1.736 8.68c.056.868 2.38 1.064 2.52 3.108.084 1.596-.868 2.716-2.268 2.8-1.68.112-2.604-.868-2.604-.868l.364-1.484s.924.7 1.652.644c.476-.028.644-.42.616-.7-.056-1.148-1.96-1.064-2.1-2.94-.112-1.568.924-3.164 3.22-3.304.868-.056 1.316.168 1.316.168l-.504 1.876s-.588-.252-1.232-.224c-.98.056-1.008.672-.98.924zm3.836-7.784c.364 0 .644.084.868.224.028 0 .084.056.112.084.028.056.056.084.084.14.42.756.644 1.82.756 2.352-.448.14-.952.28-1.428.42 0-.924-.196-2.828-.392-3.22zm1.736 16.128l3.444-.868-2.94-9.912c-.756.196-1.456.392-2.1.56 0 0 .028.028.028.056 1.568 2.38 1.568 9.164 1.568 10.164z"/></svg>' },
    { id:'etsy', label:'Etsy', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.16 10.43V7.99h2.24v-.93H9.16V4.93a.91.91 0 01.93-.93h1.31V3h-1.4C8.5 3 7.48 4.04 7.48 5.5v1.56H6.4v.93h1.08v2.48c-.01.3-.01.65-.01.96v5.23c0 .31 0 .66.01.96H6.4v.93h5.25v-.93H9.17c0-.3-.01-.65-.01-.96v-2.23h2.24v-.93H9.16v-2.09zm5.43 4.72l-1.88-4.72 1.88-4.72c.42 0 .82-.32.82-.79 0-.44-.36-.79-.82-.79-.44 0-.82.35-.82.79v9.44c0 .44.38.79.82.79.46 0 .82-.35.82-.79 0-.47-.4-.79-.82-.79zm-8.61 2.59H4.55v-1.24c.01-.3.01-.65.01-.96V7.52c0-.31 0-.66-.01-.96V5.32h1.47V4.39H4.55V3.58C4.55 2.76 3.86 2 3 2S1.45 2.76 1.45 3.58v.81H0v.93h1.45v1.24c-.01.3-.01.65-.01.96v6.02c0 .31 0 .66.01.96v1.24H0v.93h1.45v.82c0 .82.69 1.58 1.55 1.58s1.55-.76 1.55-1.58v-.82h1.47v-.93z"/></svg>' },
    { id:'gumroad', label:'Gumroad', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.587 17.04c-2.758 0-4.958-2.17-4.958-4.958 0-2.757 2.2-4.957 4.958-4.957 1.903 0 3.56 1.077 4.388 2.651h-2.817c-.523-.614-1.31-.993-2.187-.993-1.61 0-2.87 1.32-2.87 2.929 0 1.61 1.26 2.9 2.87 2.9 1.26 0 2.32-.8 2.72-1.9h-3.28v-1.87H17v.93c0 2.729-2.17 4.868-4.413 4.868z"/></svg>' },
    { id:'amazon', label:'Amazon', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.699-3.182v.685zm3.186 7.705a.661.661 0 01-.77.074c-1.081-.899-1.276-1.316-1.871-2.17-1.789 1.824-3.054 2.372-5.373 2.372-2.742 0-4.876-1.689-4.876-5.072 0-2.642 1.429-4.442 3.466-5.322 1.762-.78 4.226-.919 6.107-1.134v-.422c0-.779.06-1.699-.397-2.372-.397-.602-1.163-.851-1.836-.851-1.247 0-2.36.639-2.631 1.965-.056.298-.275.591-.573.606l-3.208-.345c-.27-.061-.572-.28-.496-.696C5.935 2.038 9.151 1 12.042 1c1.479 0 3.41.394 4.574 1.515 1.479 1.385 1.337 3.23 1.337 5.241v4.748c0 1.427.591 2.053 1.148 2.823.197.274.239.601-.01.806l-1.947 1.662zm3.41 2.032c-.49.4-1.198.43-1.746.16C16.93 18.14 16 16.5 16 16.5c-1.68 1.74-2.87 2.26-5.05 2.26-2.58 0-4.59-1.59-4.59-4.78 0-2.49 1.35-4.18 3.27-5.01 1.66-.74 3.98-.87 5.75-1.07v-.4c0-.73.06-1.6-.37-2.23-.38-.57-1.1-.8-1.73-.8-1.17 0-2.22.6-2.48 1.85-.05.28-.26.56-.54.57l-3.02-.32c-.25-.06-.54-.26-.47-.66C7.42 1.91 10.44.9 13.13.9c1.39 0 3.21.37 4.31 1.43 1.39 1.3 1.26 3.04 1.26 4.94v4.47c0 1.34.56 1.93 1.08 2.66.19.26.23.57-.01.76l-1.22 1.04-.01-.01z"/></svg>' },
  ]},
  { label: 'General', icons: [
    { id:'website', label:'Website', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>' },
    { id:'email', label:'Email', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
    { id:'phone', label:'Phone', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.1 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.01 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' },
    { id:'location', label:'Location', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
    { id:'calendar', label:'Calendar', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { id:'star', label:'Star', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id:'heart', label:'Heart', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' },
    { id:'link', label:'Link', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>' },
    { id:'play', label:'Play', svg:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="white"/></svg>' },
    { id:'shop', label:'Shop', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' },
    { id:'download', label:'Download', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' },
    { id:'book', label:'Book', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>' },
  ]},
];

// Flatten all icons for lookup
var ALL_ICONS = ICON_CATEGORIES.reduce(function(a,c){return a.concat(c.icons);}, []);

var ARROW_STYLES = [
  {key:'none',label:'None',render:function(){return null;}},
  {key:'arrow',label:'→',render:function(c){return <span style={{fontSize:14,color:c,opacity:.5}}>→</span>;}},
  {key:'chevron',label:'›',render:function(c){return <ChevronRight size={16} color={c} style={{opacity:.5}}/>;}},
  {key:'arrowRight',label:'⟶',render:function(c){return <ArrowRight size={14} color={c} style={{opacity:.5}}/>;}},
  {key:'external',label:'↗',render:function(c){return <ArrowUpRight size={14} color={c} style={{opacity:.5}}/>;}},
];

function parseIcon(icon) {
  if (!icon || icon === 'none') return null;
  if (typeof icon === 'string') {
    // Check if it matches a known SVG icon id
    var found = ALL_ICONS.find(function(i){return i.id === icon;});
    if (found) return found;
    // Legacy: JSON object icons
    if (icon.startsWith('{')) {
      try {
        var obj = JSON.parse(icon);
        var map = {heart:'heart',star:'star',link:'link',globe:'website',play:'play',
          mail:'email',phone:'phone',home:'website',book:'book',cart:'shop'};
        return ALL_ICONS.find(function(i){return i.id===(map[obj.key]||'link');}) || null;
      } catch(e) { return null; }
    }
    // Legacy emoji — just return null (no icon shown) to clean up
    if ([...icon].length <= 2) return { id:'emoji', label:icon, svg:null, emoji:icon };
  }
  return null;
}

function IconDisplay({ icon, color, size }) {
  if (!icon) return null;
  if (icon.emoji) return <span style={{fontSize:size||18,lineHeight:1}}>{icon.emoji}</span>;
  return (
    <span style={{width:size||18,height:size||18,display:'inline-flex',alignItems:'center',justifyContent:'center',color:color||'currentColor',flexShrink:0}}
      dangerouslySetInnerHTML={{__html:icon.svg.replace('currentColor', color||'currentColor')}}/>
  );
}


export default function LinkHub() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [links, setLinks] = useState([]);
  var [profile, setProfile] = useState({display_name:'',bio:'',avatar_url:''});
  var [style, setStyle] = useState({
    bg_color:'var(--sap-text-primary)',btn_color:'#132044',text_color:'#ffffff',accent_color:'var(--sap-purple)',
    bio_color:'#cccccc',btn_text_color:'#ffffff',
    font_family:'DM Sans',btn_style_type:'rounded',btn_radius:'50px',
    btn_font_size:14,btn_align:'center',arrow_style:'arrow',
    bg_image_url:'',
  });
  var [panel, setPanel] = useState('links');
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var [copied, setCopied] = useState(false);
  var [stats, setStats] = useState({total_clicks:0,click_30d:0,total_views:0});
  var [emojiPicker, setEmojiPicker] = useState(null);
  var [phoneDrag, setPhoneDrag] = useState(-1);

  useEffect(function() {
    apiGet('/api/linkhub/editor-data').then(function(d) {
      setData(d);
      if (d.links) setLinks(d.links.map(function(l) { return Object.assign({},l,{icon:parseIcon(l.icon)}); }));
      if (d.profile) {
        setProfile({display_name:d.profile.display_name||'',bio:d.profile.bio||'',avatar_url:d.profile.avatar_url||''});
        setStyle({
          bg_color:d.profile.bg_color||'var(--sap-text-primary)',btn_color:d.profile.btn_color||'#132044',
          text_color:d.profile.text_color||'#ffffff',accent_color:d.profile.accent_color||'var(--sap-purple)',
          bio_color:d.profile.bio_color||'#cccccc',btn_text_color:d.profile.btn_text_color||'#ffffff',
          font_family:d.profile.font_family||'DM Sans',
          btn_style_type:d.profile.btn_style_type||'rounded',btn_radius:d.profile.btn_radius||'50px',
          btn_font_size:d.profile.btn_font_size||14,btn_align:d.profile.btn_align||'center',
          arrow_style:d.profile.arrow_style||'arrow',bg_image_url:d.profile.bg_image_url||'',
        });
        setStats({total_clicks:d.total_clicks||0,click_30d:d.click_30d||0,total_views:d.profile.total_views||0});
      }
    });
  }, []);

  function save() {
    setSaving(true);
    var payload = Object.assign({}, style, {
      display_name:profile.display_name, bio:profile.bio, avatar_url:profile.avatar_url,
      is_published:true,
      links:links.map(function(l,i) { return {id:l.id>9999999?undefined:l.id,title:l.title,url:l.url,icon:l.icon||'🔗',is_active:l.is_active,sort_order:i,btn_bg_color:l.btn_bg_color||''}; }),
    });
    apiPost('/linkhub/save', payload).then(function(r) {
      setSaving(false);
      if (r.ok) { setSaved(true); setTimeout(function() { setSaved(false); }, 2000); }
    }).catch(function() { setSaving(false); });
  }

  function updateLink(id,f,v) { setLinks(function(p){return p.map(function(l){return l.id===id?Object.assign({},l,{[f]:v}):l;});}); }
  function removeLink(id) {
    setLinks(function(p) {
      var updated = p.filter(function(l) { return l.id !== id; });
      // Auto-save immediately after deletion
      var payload = {
        display_name: profile.display_name, bio: profile.bio,
        links: updated.map(function(l, i) { return {id:l.id>9999999?undefined:l.id, title:l.title, url:l.url, icon:l.icon||'🔗', is_active:l.is_active, sort_order:i, btn_bg_color:l.btn_bg_color||''}; }),
        style: style,
      };
      apiPost('/linkhub/save', payload).catch(function() {});
      return updated;
    });
  }
  function addLink() { setLinks(function(p){return p.concat([{id:Date.now(),title:'New Link',url:'',icon:'link',is_active:true,click_count:0,btn_bg_color:''}]);}); }
  function toggleLink(id) { var lk=links.find(function(l){return l.id===id;}); if(lk) updateLink(id,'is_active',!lk.is_active); }
  function moveLink(idx, dir) {
    var ni = idx + dir;
    if (ni < 0 || ni >= links.length) return;
    setLinks(function(p) { var n=p.slice(); var tmp=n[idx]; n[idx]=n[ni]; n[ni]=tmp; return n; });
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.origin + '/u/' + (data?.username || 'me'));
    setCopied(true); setTimeout(function(){setCopied(false);},2000);
  }

  var btnRadius = style.btn_style_type==='rounded'?50:style.btn_style_type==='soft'?12:style.btn_style_type==='outline'?50:4;
  var arrowObj = ARROW_STYLES.find(function(a){return a.key===style.arrow_style;}) || ARROW_STYLES[0];
  var pubUrl = window.location.origin + '/u/' + (data?.username || 'me');

  if (!data) return <AppLayout title={t("linkHub.title")} subtitle={t("linkHub.subtitle")}><div style={{display:'flex',height:'60vh',alignItems:'center',justifyContent:'center'}}><Spin/></div></AppLayout>;

  return (
    <AppLayout title={t("linkHub.title")} subtitle={t("linkHub.subtitle")}>
    <div style={{display:'flex',height:'calc(100vh - 72px)',fontFamily:'DM Sans,sans-serif',background:'#f0f3f9',overflow:'hidden',margin:'-24px',borderRadius:0,gap:0}}>
      {/* ═══ LEFT PANEL ═══ */}
      <div style={{width:16,flexShrink:0,background:'#f0f3f9'}}/>
      <div style={{width:620,minWidth:620,background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px 12px 0 0',display:'flex',flexDirection:'column',overflow:'hidden',marginTop:16,boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        {/* Header */}
        <div style={{padding:'14px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'var(--sap-text-primary)'}}>LinkHub</div>
            <div style={{fontSize:12,color:'var(--sap-text-faint)',fontWeight:500}}>{t('linkHub.editPage')}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={copyUrl} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,border:copied?'1px solid #bbf7d0':'1px solid #e5e7eb',background:copied?'var(--sap-green-bg)':'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:copied?'var(--sap-green)':'var(--sap-text-secondary)',transition:'all .15s'}}>
              {copied ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> Copy URL</>}
            </button>
            <a href={pubUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',textDecoration:'none',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',transition:'all .15s'}}>
              <ExternalLink size={13}/> Preview
            </a>
          </div>
        </div>

        {/* Stats — bold colour cards */}
        <style>{`
          @keyframes lhShine{0%{left:-120%}100%{left:200%}}
          @keyframes lhPop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
          @keyframes lhFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(4deg)}}
          @keyframes lhCount{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .lh-stat{transition:transform .2s ease,box-shadow .2s ease;animation:lhPop .4s ease both}
          .lh-stat:hover{transform:translateY(-3px) scale(1.03)!important}
        `}</style>
        <div style={{display:'flex',gap:8,padding:'10px 12px',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
          {[
            {v:stats.total_views,l:'Views',sub:'all time',grad:'linear-gradient(135deg,#0284c7,#38bdf8)',shadow:'rgba(14,165,233,.4)',emoji:'👁️',delay:0},
            {v:stats.total_clicks,l:'Clicks',sub:'total',grad:'linear-gradient(135deg,#6d28d9,#a78bfa)',shadow:'rgba(139,92,246,.4)',emoji:'🖱️',delay:.07},
            {v:stats.click_30d,l:'Last 30d',sub:'clicks',grad:'linear-gradient(135deg,#065f46,#34d399)',shadow:'rgba(16,185,129,.4)',emoji:'📈',delay:.14},
          ].map(function(s,i) {
            return (
              <div key={i} className="lh-stat" style={{
                flex:1,borderRadius:12,padding:'12px 10px',position:'relative',overflow:'hidden',
                background:s.grad,boxShadow:'0 6px 20px '+s.shadow,
                animationDelay:s.delay+'s',
              }}>
                {/* Shine */}
                <div style={{position:'absolute',top:0,bottom:0,width:'50%',background:'linear-gradient(105deg,transparent 35%,rgba(255,255,255,.2) 50%,transparent 65%)',animation:'lhShine 3.5s ease-in-out infinite',animationDelay:i*.9+'s',pointerEvents:'none'}}/>
                {/* Emoji */}
                <div style={{position:'absolute',right:6,top:6,fontSize:18,opacity:.2,animation:'lhFloat '+(5+i)+'s ease-in-out infinite',animationDelay:i*1.3+'s',pointerEvents:'none',userSelect:'none'}}>{s.emoji}</div>
                {/* Value */}
                <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:900,color:'#fff',lineHeight:1,animation:'lhCount .5s ease both',animationDelay:s.delay+.1+'s',textShadow:'0 2px 6px rgba(0,0,0,.15)'}}>{s.v}</div>
                <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,.9)',marginTop:3,letterSpacing:.2}}>{s.l}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:.6,marginTop:1}}>{s.sub}</div>
                {/* Bottom bar */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'rgba(255,255,255,.3)'}}/>
              </div>
            );
          })}
        </div>

        {/* Tabs — pill buttons */}
        <div style={{display:'flex',gap:6,flexShrink:0,padding:'10px 12px',background:'var(--sap-bg-input)',borderBottom:'1px solid #e5e7eb'}}>
          {[
            {k:'links',l:'🔗 Links',bg:'#f5f3ff',bgOn:'linear-gradient(135deg,#7c3aed,#8b5cf6)',color:'var(--sap-violet)',shadow:'rgba(124,58,237,.35)'},
            {k:'style',l:'🎨 Style',bg:'#fdf2f8',bgOn:'linear-gradient(135deg,#db2777,#ec4899)',color:'#db2777',shadow:'rgba(219,39,119,.35)'},
            {k:'profile',l:'👤 Profile',bg:'#eff6ff',bgOn:'linear-gradient(135deg,#2563eb,#3b82f6)',color:'#2563eb',shadow:'rgba(37,99,235,.35)'},
          ].map(function(tb) {
            var on=panel===tb.k;
            return <button key={tb.k} onClick={function(){setPanel(tb.k);}} style={{flex:1,padding:'11px 0',border:'none',borderRadius:9,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:800,letterSpacing:.2,color:on?'#fff':tb.color,background:on?tb.bgOn:'transparent',transition:'all .2s',boxShadow:on?'0 4px 12px rgba(0,0,0,.15)':'none'}}>{tb.l}</button>;
          })}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {panel==='links' && <LinksPanel links={links} style={style} addLink={addLink} updateLink={updateLink} removeLink={removeLink} toggleLink={toggleLink} moveLink={moveLink} emojiPicker={emojiPicker} setEmojiPicker={setEmojiPicker}/>}
          {panel==='style' && <StylePanel style={style} setStyle={setStyle}/>}
          {panel==='profile' && <ProfilePanel profile={profile} setProfile={setProfile} onRemoveAvatar={function(){
  setProfile(function(p){return Object.assign({},p,{avatar_url:''});});
  var payload = Object.assign({},style,{display_name:profile.display_name,bio:profile.bio,avatar_url:'',is_published:true,links:links.map(function(l,i){return {id:l.id>9999999?undefined:l.id,title:l.title,url:l.url,icon:l.icon||'link',is_active:l.is_active,sort_order:i,btn_bg_color:l.btn_bg_color||''};})});
  apiPost('/linkhub/save', payload).catch(function(){});
}}/>}
        </div>

        {/* Save */}
        <div style={{padding:'14px 20px',borderTop:'1px solid #e5e7eb',flexShrink:0}}>
          <button onClick={save} disabled={saving}
            style={{width:'100%',padding:'15px',borderRadius:10,border:'none',background:saved?'var(--sap-green)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:14,fontWeight:800,cursor:saving?'default':'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(139,92,246,.3)',opacity:saving?0.6:1}}>
            {saving?t('linkHub.saving'):saved?t('linkHub.saved'):t('linkHub.savePublish')}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT — PHONE PREVIEW ═══ */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f1f5',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,#d1d5db 1px,transparent 1px)',backgroundSize:'24px 24px',opacity:.25,pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,width:380,flexShrink:0}}>
        <div style={{width:380,borderRadius:44,background:'#1a1a1a',padding:'12px',boxShadow:'0 32px 80px rgba(0,0,0,.35)'}}>
          <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',width:120,height:28,borderRadius:14,background:'#0a0a0a',zIndex:10}}/>
          <div style={{borderRadius:32,overflow:'hidden',minHeight:680,maxHeight:'calc(100vh - 160px)',overflowY:'auto',fontFamily:style.font_family+',sans-serif',position:'relative',background:style.bg_color}}>
            {/* Background image — clipped inside phone */}
            {style.bg_image_url && <div style={{position:'absolute',inset:0,backgroundImage:'url('+style.bg_image_url+')',backgroundSize:'cover',backgroundPosition:'center',opacity:.35,pointerEvents:'none'}}/>}
            <div style={{position:'relative',padding:'60px 24px 40px',textAlign:'center'}}>
              {/* Avatar */}
              <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 14px',overflow:'hidden',border:'3px solid '+style.accent_color,background:profile.avatar_url?'transparent':'linear-gradient(135deg,'+style.accent_color+','+style.btn_color+')'}}>
                {profile.avatar_url ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:style.text_color}}>{(profile.display_name||'?')[0]}</div>}
              </div>
              <div style={{fontSize:20,fontWeight:800,color:style.text_color}}>{profile.display_name||'Your Name'}</div>
              <div style={{fontSize:13,color:style.bio_color||style.text_color,opacity:style.bio_color?1:.6,marginBottom:28,lineHeight:1.5,marginTop:4}}>{profile.bio||'Your bio here'}</div>
              {/* Links — draggable in phone preview */}
              <div style={{display:'flex',flexDirection:'column',gap:10,maxWidth:280,margin:'0 auto'}}>
                {links.filter(function(l){return l.is_active;}).map(function(link, visIdx) {
                  var isFilled = style.btn_style_type!=='outline';
                  var isDragging = phoneDrag === visIdx;
                  // Map visible index back to full array index for reorder
                  var fullIdx = links.indexOf(link);
                  return (
                    <div key={link.id} draggable
                      onDragStart={function(){setPhoneDrag(visIdx);}}
                      onDragOver={function(e){
                        e.preventDefault();
                        if (phoneDrag === visIdx || phoneDrag < 0) return;
                        // Get the active links, reorder them, then rebuild full list
                        var activeLinks = links.filter(function(l){return l.is_active;});
                        var inactiveLinks = links.filter(function(l){return !l.is_active;});
                        var item = activeLinks.splice(phoneDrag, 1)[0];
                        activeLinks.splice(visIdx, 0, item);
                        setLinks(activeLinks.concat(inactiveLinks));
                        setPhoneDrag(visIdx);
                      }}
                      onDragEnd={function(){setPhoneDrag(-1);}}
                      style={{padding:'12px 16px',borderRadius:btnRadius,
                        background:isFilled?(link.btn_bg_color||style.btn_color):'transparent',
                        border:isFilled?(isDragging?'2px solid '+style.accent_color:'none'):'2px solid '+(link.btn_bg_color||style.btn_color),
                        display:'flex',alignItems:'center',gap:10,textAlign:style.btn_align||'center',
                        cursor:'grab',opacity:isDragging?0.7:1,transition:'opacity .15s',
                        boxShadow:isDragging?'0 4px 16px rgba(0,0,0,.3)':'none'}}>
                      <IconDisplay icon={parseIcon(link.icon)} color={style.btn_text_color||style.text_color} size={18}/>
                      <span style={{fontSize:style.btn_font_size||14,fontWeight:600,flex:1,textAlign:style.btn_align||'center',color:style.btn_text_color||style.text_color}}>{link.title||'Untitled'}</span>
                      {arrowObj.render && arrowObj.render(style.btn_text_color||style.text_color)}
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:32,fontSize:10,color:style.text_color,opacity:.2}}>Powered by SuperAdPro LinkHub</div>
            </div>
          </div>
        </div>
        <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:'#fff',borderRadius:8,padding:'6px 14px',boxShadow:'0 2px 8px rgba(0,0,0,.1)',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--sap-green)'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'var(--sap-text-muted)'}}>{window.location.host}/u/</span>
          <span style={{fontSize:11,fontWeight:800,color:'var(--sap-text-primary)'}}>{data?.username||'yourname'}</span>
        </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════
// LINKS PANEL — Fix #1: Copy URL renamed, #2: up/down not drag, #3: emoji picker, #4: click count
// ═══════════════════════════════════════════════════

function LinksPanel({ links, style, addLink, updateLink, removeLink, toggleLink, moveLink, emojiPicker, setEmojiPicker }) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:0}}>{t('linkHub.yourLinks')}</h3>
        <button onClick={addLink} style={{display:'flex',alignItems:'center',gap:4,padding:'10px 20px',borderRadius:8,border:'none',background:'var(--sap-purple)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/> {t('linkHub.addLink')}</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {links.map(function(link, idx) {
          var showEmoji = emojiPicker === link.id;
          return (
            <div key={link.id} style={{background:'var(--sap-bg-input)',border:'1px solid #e5e7eb',borderRadius:12,padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {/* Up/Down reorder buttons instead of drag */}
                  <div style={{display:'flex',flexDirection:'column',gap:1}}>
                    <button onClick={function(){moveLink(idx,-1);}} disabled={idx===0} style={{border:'none',background:'none',cursor:idx===0?'default':'pointer',padding:0,opacity:idx===0?.3:1}}><ChevronUp size={14} color="var(--sap-text-faint)"/></button>
                    <button onClick={function(){moveLink(idx,1);}} disabled={idx===links.length-1} style={{border:'none',background:'none',cursor:idx===links.length-1?'default':'pointer',padding:0,opacity:idx===links.length-1?.3:1}}><ChevronDown size={14} color="var(--sap-text-faint)"/></button>
                  </div>
                  {/* Icon button — always visible, shows icon or + placeholder */}
                  <button onClick={function(){setEmojiPicker(showEmoji?null:link.id);}}
                    title={parseIcon(link.icon) ? 'Change icon' : 'Add icon'}
                    style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',background:parseIcon(link.icon)?'none':'var(--sap-bg-page)',border:parseIcon(link.icon)?'1px solid transparent':'1px dashed #94a3b8',borderRadius:6,cursor:'pointer',padding:0,transition:'all .15s',flexShrink:0}}
                    onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-purple)';e.currentTarget.style.background='rgba(139,92,246,.06)';}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor=parseIcon(link.icon)?'transparent':'var(--sap-text-faint)';e.currentTarget.style.background=parseIcon(link.icon)?'none':'var(--sap-bg-page)';}}>
                    {parseIcon(link.icon)
                      ? <IconDisplay icon={parseIcon(link.icon)} color='var(--sap-text-secondary)' size={18}/>
                      : <span style={{fontSize:16,color:'var(--sap-text-faint)',lineHeight:1}}>＋</span>}
                  </button>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>{link.title||'Untitled'}</span>
                  {link.click_count > 0 && <span style={{fontSize:9,color:'var(--sap-text-faint)',background:'var(--sap-bg-page)',padding:'1px 5px',borderRadius:3}}>{link.click_count} clicks</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={function(){toggleLink(link.id);}} style={{width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',position:'relative',background:link.is_active?'var(--sap-purple)':'#d1d5db',transition:'background .2s'}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:link.is_active?18:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                  </button>
                  <button onClick={function(){removeLink(link.id);}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={14}/></button>
                </div>
              </div>
              {/* Icon picker */}
              {showEmoji && (
                <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,marginBottom:10,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,.08)'}}>
                  {/* No icon option */}
                  <div style={{padding:'8px 12px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={function(){updateLink(link.id,'icon','none');setEmojiPicker(null);}}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:6,border:link.icon==='none'?'2px solid #8b5cf6':'2px solid #e5e7eb',background:link.icon==='none'?'rgba(139,92,246,.06)':'var(--sap-bg-input)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--sap-text-muted)',fontFamily:'inherit'}}>
                      <span style={{fontSize:16}}>✕</span> No Icon
                    </button>
                    <span style={{fontSize:11,color:'var(--sap-text-faint)'}}>Click a category to expand</span>
                  </div>
                  {/* Categories */}
                  {ICON_CATEGORIES.map(function(cat) {
                    return (
                      <div key={cat.label} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <div style={{padding:'6px 12px',fontSize:10,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:.5,background:'#fafbfc'}}>{cat.label}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'8px 10px'}}>                          {cat.icons.map(function(ic) {
                            var isSelected = link.icon === ic.id;
                            return (
                              <button key={ic.id} title={ic.label}
                                onClick={function(){updateLink(link.id,'icon',ic.id);setEmojiPicker(null);}}
                                style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,border:isSelected?'2px solid #8b5cf6':'2px solid transparent',background:isSelected?'rgba(139,92,246,.08)':'var(--sap-bg-page)',cursor:'pointer',padding:0,color:'var(--sap-text-secondary)',transition:'all .1s'}}
                                onMouseEnter={function(e){if(!isSelected){e.currentTarget.style.background='var(--sap-border-light)';}}}
                                onMouseLeave={function(e){if(!isSelected){e.currentTarget.style.background='var(--sap-bg-page)';}}}>
                                <IconDisplay icon={ic} color='var(--sap-text-secondary)' size={18}/>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <input value={link.title} onChange={function(e){updateLink(link.id,'title',e.target.value);}} placeholder={t("linkHub.linkTitlePlaceholder")} style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:6,background:'#fff'}}/>
              <input value={link.url} onChange={function(e){updateLink(link.id,'url',e.target.value);}} placeholder="https://..." style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',color:'var(--sap-text-muted)'}}/>
              {/* Per-link button colour */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                <label style={{fontSize:11,fontWeight:600,color:'var(--sap-text-faint)',whiteSpace:'nowrap'}}>Button colour</label>
                <input type="color" value={link.btn_bg_color||style.btn_color||'var(--sap-purple)'}
                  onChange={function(e){updateLink(link.id,'btn_bg_color',e.target.value);}}
                  style={{width:28,height:28,padding:2,border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',background:'none'}}/>
                <span style={{fontSize:11,color:'var(--sap-text-muted)',fontFamily:'monospace'}}>{link.btn_bg_color||'(global)'}</span>
                {link.btn_bg_color && (
                  <button onClick={function(){updateLink(link.id,'btn_bg_color','');}}
                    style={{fontSize:10,color:'var(--sap-text-faint)',background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:4,fontFamily:'inherit'}}>
                    ✕ Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {links.length === 0 && <div style={{textAlign:'center',padding:'40px 20px',color:'var(--sap-text-faint)',fontSize:13}}>{t("linkHub.noLinks")}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLE PANEL — Fix #3: colourful buttons, #5: more fonts + text sizing, #6: separate btn/bio colours, #9: text alignment, #10: arrow styles
// ═══════════════════════════════════════════════════

function StylePanel({ style, setStyle }) {
  function upd(f) { return function(e) { setStyle(function(s){return Object.assign({},s,{[f]:e.target.value});}); }; }
  function updNum(f) { return function(e) { setStyle(function(s){return Object.assign({},s,{[f]:parseInt(e.target.value)||14});}); }; }

  var colours = [
    {key:'bg_color',label:'Background Color'},
    {key:'btn_color',label:'Button Color'},
    {key:'btn_text_color',label:'Button Text Color'},
    {key:'text_color',label:'Name Color'},
    {key:'bio_color',label:'Bio Text Color'},
    {key:'accent_color',label:'Accent / Border'},
  ];

  return (
    <div>
      <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 20px'}}>Customize Style</h3>

      {/* Colours */}
      {colours.map(function(c) {
        return (
          <div key={c.key} style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{c.label}</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="color" value={style[c.key]||'#ffffff'} onChange={upd(c.key)} style={{width:36,height:36,border:'2px solid #e5e7eb',borderRadius:8,cursor:'pointer',padding:0}}/>
              <input value={style[c.key]||''} onChange={upd(c.key)} style={{flex:1,padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:11,fontFamily:'monospace',outline:'none'}}/>
              {/* Preview dot */}
              <div style={{width:20,height:20,borderRadius:4,background:style[c.key]||'#fff',border:'1px solid #d1d5db'}}/>
            </div>
          </div>
        );
      })}

      {/* Background image — upload or URL */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Background Image</label>
        {style.bg_image_url && (
          <div style={{width:'100%',height:60,borderRadius:8,marginBottom:6,backgroundImage:'url('+style.bg_image_url+')',backgroundSize:'cover',backgroundPosition:'center',border:'1px solid #e5e7eb',position:'relative'}}>
            <button onClick={function(){
              var newStyle = Object.assign({},style,{bg_image_url:''});
              setStyle(newStyle);
              apiPost('/linkhub/save', Object.assign({},newStyle,{display_name:profile.display_name,bio:profile.bio,avatar_url:profile.avatar_url,is_published:true,links:links.map(function(l,i){return {id:l.id>9999999?undefined:l.id,title:l.title,url:l.url,icon:l.icon||'link',is_active:l.is_active,sort_order:i};})})).catch(function(){});
            }} style={{position:'absolute',top:6,right:6,padding:'4px 10px',borderRadius:6,border:'none',background:'rgba(220,38,38,.85)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3,fontFamily:'inherit'}}>
              ✕ Remove
            </button>
          </div>
        )}
        <div style={{display:'flex',gap:6}}>
          <label style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--sap-text-muted)',whiteSpace:'nowrap'}}>
            <Upload size={12}/> Upload
            <input type="file" accept="image/*" onChange={function(e){
              var file=e.target.files[0]; if(!file) return;
              var reader=new FileReader();
              reader.onload=function(ev){setStyle(function(s){return Object.assign({},s,{bg_image_url:ev.target.result});});};
              reader.readAsDataURL(file);
            }} style={{display:'none'}}/>
          </label>
          <input value={style.bg_image_url||''} onChange={upd('bg_image_url')} placeholder={t("linkHub.orPasteUrl")} style={{flex:1,padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:10,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* Font */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Font Family</label>
        <select value={style.font_family} onChange={upd('font_family')} style={{width:'100%',padding:'9px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:style.font_family+',sans-serif',outline:'none',background:'#fff'}}>
          {FONTS.map(function(f){return <option key={f} value={f} style={{fontFamily:f}}>{f}</option>;})}
        </select>
      </div>

      {/* Button text size */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Button Text Size: {style.btn_font_size||14}px</label>
        <input type="range" min="10" max="22" value={style.btn_font_size||14} onChange={updNum('btn_font_size')} style={{width:'100%',accentColor:'var(--sap-purple)'}}/>
      </div>

      {/* Button shape */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Button Shape</label>
        <div style={{display:'flex',gap:6}}>
          {[{k:'rounded',r:20,label:'Rounded'},{k:'soft',r:8,label:'Soft'},{k:'sharp',r:2,label:'Sharp'},{k:'outline',r:20,label:'Outline'}].map(function(bs) {
            var on = style.btn_style_type===bs.k;
            return (
              <button key={bs.k} onClick={function(){setStyle(function(s){return Object.assign({},s,{btn_style_type:bs.k,btn_radius:bs.r+'px'});});}}
                style={{flex:1,padding:'8px 4px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:48,height:18,borderRadius:bs.r,background:bs.k==='outline'?'transparent':(on?style.btn_color||'var(--sap-purple)':'#c4c4c4'),border:bs.k==='outline'?'2px solid '+(on?style.btn_color||'var(--sap-purple)':'#c4c4c4'):'none'}}/>
                <span style={{fontSize:9,fontWeight:on?700:500,color:on?'var(--sap-purple)':'var(--sap-text-faint)'}}>{bs.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text alignment */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Button Text Alignment</label>
        <div style={{display:'flex',gap:6}}>
          {[{k:'left',Icon:AlignLeft},{k:'center',Icon:AlignCenter},{k:'right',Icon:AlignRight}].map(function(a) {
            var on = style.btn_align===a.k;
            return (
              <button key={a.k} onClick={function(){setStyle(function(s){return Object.assign({},s,{btn_align:a.k});});}}
                style={{flex:1,padding:'8px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',display:'flex',justifyContent:'center'}}>
                <a.Icon size={16} color={on?'var(--sap-purple)':'var(--sap-text-faint)'}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* Arrow style */}
      <div>
        <label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Button Arrow</label>
        <div style={{display:'flex',gap:6}}>
          {ARROW_STYLES.map(function(a) {
            var on = style.arrow_style===a.key;
            return (
              <button key={a.key} onClick={function(){setStyle(function(s){return Object.assign({},s,{arrow_style:a.key});});}}
                style={{flex:1,padding:'8px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span style={{fontSize:14}}>{a.label}</span>
                <span style={{fontSize:8,color:on?'var(--sap-purple)':'var(--sap-text-faint)'}}>{a.key}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PROFILE PANEL — Fix #7: bg image, #8: avatar upload
// ═══════════════════════════════════════════════════

function ProfilePanel({ profile, setProfile, onRemoveAvatar }) {
  function upd(f) { return function(e){setProfile(function(p){return Object.assign({},p,{[f]:e.target.value});});}; }
  var inputStyle = {width:'100%',padding:'12px 14px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  function handleAvatarUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    // Show local preview immediately
    var reader = new FileReader();
    reader.onload = function(ev) {
      setProfile(function(p) { return Object.assign({},p,{avatar_url:ev.target.result}); });
    };
    reader.readAsDataURL(file);
    // Upload to R2 in background
    var fd = new FormData();
    fd.append('avatar', file);
    fetch('/linkhub/upload-avatar', {method:'POST', body:fd, credentials:'include'})
      .then(function(r){return r.json();})
      .then(function(d){
        if (d.avatar_url) {
          setProfile(function(p) { return Object.assign({},p,{avatar_url:d.avatar_url}); });
        }
      }).catch(function(){});
  }

  return (
    <div>
      <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 20px'}}>Profile</h3>

      {/* Avatar */}
      <div style={{marginBottom:18,textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 10px',overflow:'hidden',border:'3px solid #8b5cf6',background:'var(--sap-border-light)'}}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'var(--sap-text-faint)'}}>{(profile.display_name||'?')[0]}</div>}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center'}}>
          <label style={{display:'inline-flex',alignItems:'center',gap:4,padding:'6px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--sap-text-muted)'}}>
            <Upload size={12}/> Upload Photo
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}}/>
          </label>
          {profile.avatar_url && (
            <button onClick={onRemoveAvatar} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid #fecaca',background:'var(--sap-red-bg)',cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--sap-red)',fontFamily:'inherit'}}>
              ✕ Remove
            </button>
          )}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Display Name</label>
        <input value={profile.display_name} onChange={upd('display_name')} placeholder={t("linkHub.yourName")} style={inputStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Bio</label>
        <textarea value={profile.bio} onChange={upd('bio')} rows={3} placeholder={t("linkHub.bioPlaceholder")} style={Object.assign({},inputStyle,{resize:'vertical'})}/>
      </div>
      <div>
        <label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>Avatar URL (or use upload above)</label>
        <input value={profile.avatar_url} onChange={upd('avatar_url')} placeholder="https://..." style={Object.assign({},inputStyle,{fontSize:11,color:'var(--sap-text-muted)'})}/>
      </div>
    </div>
  );
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-purple)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
