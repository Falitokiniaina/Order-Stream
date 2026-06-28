-- Pour restaurer cette base :
-- psql "$DATABASE_URL" < base_gerland_2026.sql
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.reservations DROP CONSTRAINT IF EXISTS reservations_commande_id_commandes_id_fk;
ALTER TABLE IF EXISTS ONLY public.parametrage DROP CONSTRAINT IF EXISTS parametrage_evenement_id_evenements_id_fk;
ALTER TABLE IF EXISTS ONLY public.event_snapshots DROP CONSTRAINT IF EXISTS event_snapshots_event_id_evenements_id_fk;
ALTER TABLE IF EXISTS ONLY public.device_info DROP CONSTRAINT IF EXISTS device_info_order_id_commandes_id_fk;
ALTER TABLE IF EXISTS ONLY public.commandes DROP CONSTRAINT IF EXISTS commandes_evenement_id_evenements_id_fk;
ALTER TABLE IF EXISTS ONLY public.commande_items DROP CONSTRAINT IF EXISTS commande_items_commande_id_commandes_id_fk;
ALTER TABLE IF EXISTS ONLY public.articles DROP CONSTRAINT IF EXISTS articles_evenement_id_evenements_id_fk;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.reservations DROP CONSTRAINT IF EXISTS reservations_pkey;
ALTER TABLE IF EXISTS ONLY public.parametrage DROP CONSTRAINT IF EXISTS parametrage_pkey;
ALTER TABLE IF EXISTS ONLY public.event_snapshots DROP CONSTRAINT IF EXISTS event_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.evenements DROP CONSTRAINT IF EXISTS evenements_slug_url_unique;
ALTER TABLE IF EXISTS ONLY public.evenements DROP CONSTRAINT IF EXISTS evenements_pkey;
ALTER TABLE IF EXISTS ONLY public.device_info DROP CONSTRAINT IF EXISTS device_info_pkey;
ALTER TABLE IF EXISTS ONLY public.commandes DROP CONSTRAINT IF EXISTS commandes_pkey;
ALTER TABLE IF EXISTS ONLY public.commande_items DROP CONSTRAINT IF EXISTS commande_items_pkey;
ALTER TABLE IF EXISTS ONLY public.articles DROP CONSTRAINT IF EXISTS articles_pkey;
ALTER TABLE IF EXISTS public.system_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reservations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.parametrage ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_snapshots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.evenements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.device_info ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.commandes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.commande_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.articles ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.system_settings_id_seq;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.sessions;
DROP SEQUENCE IF EXISTS public.reservations_id_seq;
DROP TABLE IF EXISTS public.reservations;
DROP SEQUENCE IF EXISTS public.parametrage_id_seq;
DROP TABLE IF EXISTS public.parametrage;
DROP SEQUENCE IF EXISTS public.event_snapshots_id_seq;
DROP TABLE IF EXISTS public.event_snapshots;
DROP SEQUENCE IF EXISTS public.evenements_id_seq;
DROP TABLE IF EXISTS public.evenements;
DROP SEQUENCE IF EXISTS public.device_info_id_seq;
DROP TABLE IF EXISTS public.device_info;
DROP SEQUENCE IF EXISTS public.commandes_id_seq;
DROP TABLE IF EXISTS public.commandes;
DROP SEQUENCE IF EXISTS public.commande_items_id_seq;
DROP TABLE IF EXISTS public.commande_items;
DROP SEQUENCE IF EXISTS public.articles_id_seq;
DROP TABLE IF EXISTS public.articles;
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    evenement_id integer NOT NULL,
    nom text NOT NULL,
    description text,
    prix numeric(10,2) NOT NULL,
    image_url text,
    stock_total integer DEFAULT 50 NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.articles OWNER TO postgres;

--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.articles_id_seq OWNER TO postgres;

--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- Name: commande_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commande_items (
    id integer NOT NULL,
    commande_id integer NOT NULL,
    article_id integer NOT NULL,
    quantite integer NOT NULL,
    prix_unitaire numeric(10,2) NOT NULL,
    statut_livraison text DEFAULT 'non_livre'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.commande_items OWNER TO postgres;

--
-- Name: commande_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commande_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.commande_items_id_seq OWNER TO postgres;

--
-- Name: commande_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commande_items_id_seq OWNED BY public.commande_items.id;


--
-- Name: commandes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commandes (
    id integer NOT NULL,
    evenement_id integer NOT NULL,
    nom_commande text NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    montant_total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    paye_cb numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    paye_especes numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    paye_cheque numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expiration_reservation timestamp with time zone
);


ALTER TABLE public.commandes OWNER TO postgres;

--
-- Name: commandes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commandes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.commandes_id_seq OWNER TO postgres;

--
-- Name: commandes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commandes_id_seq OWNED BY public.commandes.id;


--
-- Name: device_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_info (
    id integer NOT NULL,
    order_id integer NOT NULL,
    device_type text,
    os_name text,
    os_version text,
    brand_model text,
    browser_name text,
    browser_version text,
    screen_width integer,
    screen_height integer,
    pixel_ratio double precision,
    screen_orientation text,
    cpu_cores integer,
    ram_gb double precision,
    touch_support boolean,
    connection_type text,
    connection_speed_mbps double precision,
    save_data_mode boolean,
    ip_address text,
    ip_country text,
    ip_region text,
    ip_city text,
    ip_isp text,
    ip_lat_approx double precision,
    ip_lng_approx double precision,
    timezone text,
    browser_language text,
    browser_languages jsonb,
    session_id text,
    page_url text,
    referrer text,
    cookies_enabled boolean,
    do_not_track boolean,
    client_datetime timestamp with time zone,
    server_datetime timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_info OWNER TO postgres;

--
-- Name: device_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_info_id_seq OWNER TO postgres;

--
-- Name: device_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_info_id_seq OWNED BY public.device_info.id;


--
-- Name: evenements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evenements (
    id integer NOT NULL,
    nom text NOT NULL,
    slug_url text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evenements OWNER TO postgres;

--
-- Name: evenements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evenements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evenements_id_seq OWNER TO postgres;

--
-- Name: evenements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evenements_id_seq OWNED BY public.evenements.id;


--
-- Name: event_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_snapshots (
    id integer NOT NULL,
    event_id integer NOT NULL,
    label text NOT NULL,
    snapshot jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_snapshots OWNER TO postgres;

--
-- Name: event_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_snapshots_id_seq OWNER TO postgres;

--
-- Name: event_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_snapshots_id_seq OWNED BY public.event_snapshots.id;


--
-- Name: parametrage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parametrage (
    id integer NOT NULL,
    evenement_id integer NOT NULL,
    temps_reservation_minutes integer DEFAULT 20 NOT NULL,
    mdp_caisse text DEFAULT 'caisse123'::text NOT NULL,
    mdp_preparateur text DEFAULT 'prep123'::text NOT NULL,
    vente_ouverte boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    allow_reprendre_commande boolean DEFAULT false NOT NULL,
    mdp_admin_local text DEFAULT 'admin123'::text NOT NULL
);


ALTER TABLE public.parametrage OWNER TO postgres;

--
-- Name: parametrage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parametrage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parametrage_id_seq OWNER TO postgres;

--
-- Name: parametrage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parametrage_id_seq OWNED BY public.parametrage.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    commande_id integer NOT NULL,
    article_id integer NOT NULL,
    quantite_reservee integer NOT NULL,
    expire_at timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.reservations OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservations_id_seq OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    token text NOT NULL,
    role text NOT NULL,
    event_slug text,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    mdp_admin text DEFAULT 'admin123'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    favicon_svg text DEFAULT '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C53030"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><path d="M20 3 L8 17 H15 L12 29 L24 15 H17 Z" fill="white"/></svg>'::text NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- Name: commande_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commande_items ALTER COLUMN id SET DEFAULT nextval('public.commande_items_id_seq'::regclass);


--
-- Name: commandes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commandes ALTER COLUMN id SET DEFAULT nextval('public.commandes_id_seq'::regclass);


--
-- Name: device_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_info ALTER COLUMN id SET DEFAULT nextval('public.device_info_id_seq'::regclass);


--
-- Name: evenements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evenements ALTER COLUMN id SET DEFAULT nextval('public.evenements_id_seq'::regclass);


--
-- Name: event_snapshots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_snapshots ALTER COLUMN id SET DEFAULT nextval('public.event_snapshots_id_seq'::regclass);


--
-- Name: parametrage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametrage ALTER COLUMN id SET DEFAULT nextval('public.parametrage_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Data for Name: articles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.articles (id, evenement_id, nom, description, prix, image_url, stock_total, disponible, created_at, display_order) FROM stdin;
7	1	coca cola (cannette)	Coca-Cola 33cl bien frais	2.00	https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	10
12	2	test_event_2_article_1	\N	2.00	data:image/jpeg;base64,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	10	t	2026-05-15 22:20:01.353+00	0
6	1	boisson (générique)	Boisson au choix	1.00	https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	0
8	1	boisson gazeuse	Boisson gazeuse assortie	2.00	https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	9
3	1	bagnat catless	Pan bagnat végétarien sans fromage	8.00	https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	2
9	1	orangina	Orangina pétillant 25cl	2.00	https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	3
11	1	eau minérale	Eau plate ou pétillante 50cl	1.00	https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	7
10	1	ice tea	Ice Tea pêche ou citron	2.00	https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80	4	f	2026-05-15 12:30:11.881745+00	6
5	1	vary anana + saosisy gasy + boulettes	Riz à la banane, saucisse malgache et boulettes	8.00	https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400&q=80	50	t	2026-05-15 12:30:11.881745+00	1
1	1	box salé	Assortiment de snacks salés maison	5.00	https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80	1	t	2026-05-15 12:30:11.881745+00	4
4	1	hot dog frites	Hot dog grillé avec frites maison	8.00	data:image/jpeg;base64,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	50	t	2026-05-15 12:30:11.881745+00	8
2	1	box sucré	Assortiment de gourmandises sucrées	5.00	https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=400&q=80	50	f	2026-05-15 12:30:11.881745+00	5
\.


--
-- Data for Name: commande_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commande_items (id, commande_id, article_id, quantite, prix_unitaire, statut_livraison, updated_at) FROM stdin;
2	2	1	1	5.00	non_livre	2026-05-15 13:19:16.410385+00
3	3	1	1	5.00	non_livre	2026-05-15 13:19:27.877057+00
5	5	1	1	5.00	non_livre	2026-05-15 13:20:45.609604+00
6	6	1	1	5.00	non_livre	2026-05-15 22:12:18.01655+00
7	6	2	1	5.00	non_livre	2026-05-15 22:12:18.022376+00
8	6	4	1	8.00	non_livre	2026-05-15 22:12:18.025538+00
9	7	5	1	8.00	non_livre	2026-05-16 06:39:47.471873+00
10	7	6	1	1.00	non_livre	2026-05-16 06:39:47.477633+00
12	8	3	1	8.00	non_livre	2026-05-16 21:17:33.661013+00
11	8	2	2	5.00	livre	2026-05-16 21:19:10.769+00
13	8	4	1	8.00	livre	2026-05-16 21:19:10.769+00
1	1	1	1	5.00	livre	2026-05-16 21:22:18.626+00
17	4	1	1	5.00	non_livre	2026-05-16 22:36:56.88212+00
18	4	7	1	2.00	non_livre	2026-05-16 22:36:56.885938+00
19	4	8	50	2.00	non_livre	2026-05-16 22:36:56.888228+00
20	9	5	1	8.00	non_livre	2026-05-16 22:42:45.412487+00
24	10	3	2	8.00	non_livre	2026-05-16 23:50:24.981289+00
25	10	5	1	8.00	non_livre	2026-05-16 23:50:24.986383+00
26	10	6	1	1.00	non_livre	2026-05-16 23:50:24.991244+00
27	10	9	2	2.00	non_livre	2026-05-16 23:50:24.996433+00
29	11	3	4	8.00	non_livre	2026-05-16 23:52:52.506453+00
30	12	5	1	8.00	non_livre	2026-05-16 23:59:17.93094+00
31	12	6	1	1.00	non_livre	2026-05-16 23:59:17.934867+00
32	13	5	1	8.00	non_livre	2026-05-17 07:12:42.18033+00
33	13	6	1	1.00	non_livre	2026-05-17 07:12:42.184628+00
34	15	5	1	8.00	non_livre	2026-05-17 07:23:33.566249+00
35	15	6	1	1.00	non_livre	2026-05-17 07:23:33.598685+00
36	15	10	1	2.00	non_livre	2026-05-17 07:23:33.602356+00
73	50	7	1	2.00	non_livre	2026-05-17 09:01:28.378332+00
74	50	10	1	2.00	non_livre	2026-05-17 09:01:28.382811+00
75	50	11	1	1.00	non_livre	2026-05-17 09:01:28.385661+00
76	17	6	1	1.00	non_livre	2026-05-17 09:06:25.032061+00
77	17	7	1	2.00	non_livre	2026-05-17 09:06:25.035746+00
78	17	11	1	1.00	non_livre	2026-05-17 09:06:25.039081+00
82	51	3	1	8.00	livre	2026-05-17 09:16:32.995+00
83	51	4	1	8.00	livre	2026-05-17 09:16:32.995+00
84	51	7	1	2.00	livre	2026-05-17 09:16:32.995+00
85	52	5	1	8.00	non_livre	2026-05-17 09:39:25.734717+00
86	52	7	1	2.00	non_livre	2026-05-17 09:39:25.738823+00
87	53	5	1	8.00	non_livre	2026-05-17 10:17:14.99367+00
88	53	9	1	2.00	non_livre	2026-05-17 10:17:14.997777+00
89	54	3	1	8.00	livre	2026-05-17 10:55:53.001+00
90	54	5	1	8.00	livre	2026-05-17 10:55:53.001+00
91	55	3	1	8.00	non_livre	2026-05-17 10:56:23.677572+00
92	55	5	1	8.00	non_livre	2026-05-17 10:56:23.748678+00
93	56	5	1	8.00	livre	2026-05-17 10:58:16.668+00
94	56	6	1	1.00	livre	2026-05-17 10:58:16.668+00
95	56	7	1	2.00	livre	2026-05-17 10:58:16.668+00
96	57	3	1	8.00	livre	2026-05-17 11:59:10.558+00
97	57	4	1	8.00	livre	2026-05-17 11:59:10.558+00
98	57	7	1	2.00	livre	2026-05-17 11:59:10.558+00
99	60	5	1	8.00	non_livre	2026-05-17 20:40:12.717015+00
100	60	9	2	2.00	non_livre	2026-05-17 20:40:12.731454+00
101	61	3	1	8.00	non_livre	2026-05-17 21:15:59.359727+00
102	61	5	1	8.00	non_livre	2026-05-17 21:15:59.363794+00
103	61	6	1	1.00	non_livre	2026-05-17 21:15:59.370599+00
104	61	7	1	2.00	non_livre	2026-05-17 21:15:59.373412+00
105	62	3	1	8.00	non_livre	2026-05-17 21:25:39.995308+00
106	62	5	1	8.00	non_livre	2026-05-17 21:25:40.007376+00
107	62	7	1	2.00	non_livre	2026-05-17 21:25:40.009731+00
108	63	12	3	2.00	non_livre	2026-05-17 22:06:52.303+00
109	67	5	1	8.00	non_livre	2026-05-22 20:21:37.204269+00
110	67	6	1	1.00	non_livre	2026-05-22 20:21:37.219651+00
111	68	5	1	8.00	non_livre	2026-05-22 20:33:48.350238+00
\.


--
-- Data for Name: commandes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commandes (id, evenement_id, nom_commande, statut, montant_total, paye_cb, paye_especes, paye_cheque, created_at, updated_at, expiration_reservation) FROM stdin;
12	1	falyidfq	expiree	9.00	0.00	0.00	0.00	2026-05-16 23:59:17.895762+00	2026-05-17 00:00:24+00	2026-05-17 00:00:18.154+00
2	1	test	en_attente	5.00	0.00	0.00	0.00	2026-05-15 13:19:16.385357+00	2026-05-15 13:19:16.385357+00	\N
3	1	testres	en_attente	5.00	0.00	0.00	0.00	2026-05-15 13:19:27.873612+00	2026-05-15 13:19:27.873612+00	\N
5	1	faly	en_attente	5.00	0.00	0.00	0.00	2026-05-15 13:20:45.576077+00	2026-05-15 13:20:45.576077+00	\N
15	1	ici2	expiree	11.00	0.00	0.00	0.00	2026-05-17 07:21:49.787511+00	2026-05-17 07:24:35.66+00	2026-05-17 07:24:33.781+00
16	1	marie	en_attente	0.00	0.00	0.00	0.00	2026-05-17 07:47:45.82866+00	2026-05-17 07:47:45.82866+00	\N
8	1	sdfqsdf	livree_partiellement	26.00	26.00	0.00	0.00	2026-05-16 21:17:33.539167+00	2026-05-16 21:19:10.806+00	2026-05-16 21:37:33.831+00
13	1	ici	expiree	9.00	0.00	0.00	0.00	2026-05-17 07:12:42.144609+00	2026-05-17 11:58:53.113+00	2026-05-17 11:58:52.654+00
1	1	faly	livree	5.00	5.00	0.00	0.00	2026-05-15 12:52:50.811305+00	2026-05-16 21:22:18.63+00	2026-05-16 21:41:48.684+00
57	1	kanto1	livree	18.00	18.00	0.00	0.00	2026-05-17 11:55:58.037336+00	2026-05-17 11:59:10.571+00	2026-05-17 11:59:37.191+00
6	1	faly2	en_attente	18.00	0.00	0.00	0.00	2026-05-15 22:12:17.952049+00	2026-05-16 21:31:12.009272+00	\N
7	1	gna	en_attente	9.00	0.00	0.00	0.00	2026-05-16 06:39:47.439779+00	2026-05-16 21:35:16.817122+00	\N
58	1	ouihoi	en_attente	0.00	0.00	0.00	0.00	2026-05-17 12:01:32.077043+00	2026-05-17 12:01:32.077043+00	\N
59	1	juho	en_attente	0.00	0.00	0.00	0.00	2026-05-17 12:01:55.248401+00	2026-05-17 12:01:55.248401+00	\N
60	1	fgh	payee	12.00	0.00	0.00	12.00	2026-05-17 20:39:06.627845+00	2026-05-17 20:40:30.554511+00	2026-05-17 20:41:12.903+00
61	1	test100	expiree	19.00	0.00	0.00	0.00	2026-05-17 21:15:54.728641+00	2026-05-17 21:17:03.203+00	2026-05-17 21:16:59.602+00
4	1	testres2	payee	107.00	107.00	0.00	0.00	2026-05-15 13:19:33.944253+00	2026-05-16 22:37:20.184236+00	2026-05-16 22:37:57.055+00
50	1	noa1	expiree	5.00	0.00	0.00	0.00	2026-05-17 07:56:45.491957+00	2026-05-17 09:04:52.886+00	2026-05-17 09:04:48.342+00
9	1	limik	payee	8.00	0.00	8.00	0.00	2026-05-16 22:42:45.379404+00	2026-05-16 22:44:42.967702+00	2026-05-16 22:45:30.772+00
62	1	yrieje	expiree	18.00	0.00	0.00	0.00	2026-05-17 21:25:36.783284+00	2026-05-17 22:04:28.221+00	2026-05-17 21:26:40.239+00
17	1	noa	expiree	4.00	0.00	0.00	0.00	2026-05-17 07:50:48.944964+00	2026-05-17 09:07:31.745+00	2026-05-17 09:07:25.269+00
10	1	jrty	expiree	29.00	0.00	0.00	0.00	2026-05-16 23:41:47.152941+00	2026-05-16 23:51:36.487+00	2026-05-16 23:51:25.219+00
63	2	fgdgfsd	expiree	6.00	0.00	0.00	0.00	2026-05-17 22:06:49.431+00	2026-05-21 17:00:53.103+00	2026-05-17 22:26:52.475+00
64	1	fgdsg	en_attente	0.00	0.00	0.00	0.00	2026-05-21 17:00:53.569059+00	2026-05-21 17:00:53.569059+00	\N
51	1	kanto	livree	18.00	18.00	0.00	0.00	2026-05-17 09:14:06.826819+00	2026-05-17 09:16:33.001+00	2026-05-17 09:16:14.933+00
11	1	test563	expiree	32.00	0.00	0.00	0.00	2026-05-16 23:51:57.803445+00	2026-05-16 23:53:58.401+00	2026-05-16 23:53:52.677+00
65	1	dfgsf	en_attente	0.00	0.00	0.00	0.00	2026-05-21 18:15:39.141558+00	2026-05-21 18:15:39.141558+00	\N
66	1	fhgfhd	en_attente	0.00	0.00	0.00	0.00	2026-05-22 20:19:43.316099+00	2026-05-22 20:19:43.316099+00	\N
52	1	stylo	expiree	10.00	0.00	0.00	0.00	2026-05-17 09:39:20.538751+00	2026-05-17 09:40:31.335+00	2026-05-17 09:40:25.975+00
53	1	clavier	expiree	10.00	0.00	0.00	0.00	2026-05-17 10:17:10.890319+00	2026-05-17 10:18:20.855+00	2026-05-17 10:18:15.164+00
67	1	fddsq	expiree	9.00	0.00	0.00	0.00	2026-05-22 20:20:13.305372+00	2026-05-22 20:24:15.25+00	2026-05-22 20:24:04.714+00
54	1	qouris	livree	16.00	16.00	0.00	0.00	2026-05-17 10:23:33.494543+00	2026-05-17 10:55:53.229+00	2026-05-17 10:24:37.134+00
55	1	yeeje	payee	16.00	16.00	0.00	0.00	2026-05-17 10:56:15.244191+00	2026-05-17 10:56:33.361907+00	2026-05-17 10:57:23.987+00
68	1	dfq	expiree	8.00	0.00	0.00	0.00	2026-05-22 20:33:38.455042+00	2026-05-22 20:34:51.86+00	2026-05-22 20:34:48.633+00
56	1	david	livree	11.00	0.00	11.00	0.00	2026-05-17 10:57:11.826239+00	2026-05-17 10:58:16.707+00	2026-05-17 10:58:23.051+00
\.


--
-- Data for Name: device_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_info (id, order_id, device_type, os_name, os_version, brand_model, browser_name, browser_version, screen_width, screen_height, pixel_ratio, screen_orientation, cpu_cores, ram_gb, touch_support, connection_type, connection_speed_mbps, save_data_mode, ip_address, ip_country, ip_region, ip_city, ip_isp, ip_lat_approx, ip_lng_approx, timezone, browser_language, browser_languages, session_id, page_url, referrer, cookies_enabled, do_not_track, client_datetime, server_datetime, created_at) FROM stdin;
1	61	mobile	Android	10	Linux — Android 10	Chrome	147	360	800	3	portrait	8	4	t	4g	1.75	f	92.184.124.3	France	Bourgogne	Châtillon-sur-Seine	Orange S.A.	47.8585	4.57375	Europe/Paris	fr	["fr", "fr-FR", "en-US", "en"]	086mm9u9xorhmpa9yb3i	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/festival-2026	\N	t	f	2026-05-17 21:16:00.103+00	2026-05-17 21:15:59.933+00	2026-05-17 21:15:59.933825+00
2	62	mobile	Android	13.0.0	SM-G781B	Google Chrome	147	360	800	3	portrait	8	4	t	4g	1.75	f	92.184.124.3	France	Bourgogne	Châtillon-sur-Seine	Orange S.A.	47.8585	4.57375	Europe/Paris	fr	["fr", "fr-FR", "en-US", "en"]	8q563uq88smpaaav50	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/festival-2026	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/festival-2026	t	f	2026-05-17 21:25:40.712+00	2026-05-17 21:25:40.506+00	2026-05-17 21:25:40.50754+00
3	63	desktop	Windows	10.0.0	Windows NT 10.0 – Win64	Google Chrome	148	1920	1200	1	landscape	8	16	t	4g	10	f	176.147.45.157	France	Rhône-Alpes	Saint-Priest	BOUYGUES Telecom	45.6959	4.9424	Europe/Paris	fr	["fr", "fr-FR", "en-US", "en"]	y5cli4dw6smpabs27v	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/asso/	\N	t	f	2026-05-17 22:07:01.305+00	2026-05-17 22:06:52.707+00	2026-05-17 22:06:52.708+00
4	67	desktop	Windows	19.0.0	Windows NT 10.0 – Win64	Google Chrome	148	1536	864	1.25	landscape	12	8	f	4g	10	f	92.184.124.223	France	Bourgogne	Châtillon-sur-Seine	Orange S.A.	47.8585	4.57375	Europe/Paris	fr	["fr", "fr-FR", "en-US", "en"]	9qqqg5of77dmphd6hp7	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/festival-2026	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/__replco/workspace_iframe.html?initialPath=%2Ffestival-2026&id=artifacts%2Fquickserve	t	f	2026-05-22 20:21:58.613+00	2026-05-22 20:21:37.792+00	2026-05-22 20:21:37.794437+00
5	68	desktop	Windows	19.0.0	Windows NT 10.0 – Win64	Google Chrome	148	1536	864	1.25	landscape	12	8	f	4g	3.5	f	92.184.124.223	France	Bourgogne	Châtillon-sur-Seine	Orange S.A.	47.8585	4.57375	Europe/Paris	fr	["fr", "fr-FR", "en-US", "en"]	mela5scmjf9mphdnr89	https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/festival-2026	\N	t	f	2026-05-22 20:34:09.784+00	2026-05-22 20:33:48.942+00	2026-05-22 20:33:48.94275+00
\.


--
-- Data for Name: evenements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evenements (id, nom, slug_url, actif, created_at) FROM stdin;
1	Festival QuickServe 2026	festival-2026	t	2026-05-15 12:30:11.881745+00
2	asso	asso	t	2026-05-15 13:14:04.764066+00
\.


--
-- Data for Name: event_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_snapshots (id, event_id, label, snapshot, created_at) FROM stdin;
2	2	test2_asso	{"articles": [{"id": 12, "nom": "test_event_2_article_1", "prix": "2.00", "image_url": "data:image/jpeg;base64,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", "created_at": "2026-05-15T22:20:01.353Z", "disponible": true, "description": null, "stock_total": 10, "evenement_id": 2}], "commandes": [{"id": 63, "statut": "reservee", "paye_cb": "0.00", "created_at": "2026-05-17T22:06:49.431Z", "updated_at": "2026-05-17T22:06:52.473Z", "paye_cheque": "0.00", "evenement_id": 2, "nom_commande": "fgdgfsd", "paye_especes": "0.00", "montant_total": "6.00", "expiration_reservation": "2026-05-17T22:26:52.475Z"}], "device_info": [{"id": 3, "ip_isp": "BOUYGUES Telecom", "ram_gb": 16, "ip_city": "Saint-Priest", "os_name": "Windows", "order_id": 63, "page_url": "https://ab25b5fb-59eb-4b48-a648-c1fa3aa4c0be-00-1bjxf2n3h8yyd.kirk.replit.dev/asso/", "referrer": null, "timezone": "Europe/Paris", "cpu_cores": 8, "ip_region": "Rhône-Alpes", "created_at": "2026-05-17T22:06:52.708Z", "ip_address": "176.147.45.157", "ip_country": "France", "os_version": "10.0.0", "session_id": "y5cli4dw6smpabs27v", "brand_model": "Windows NT 10.0 – Win64", "device_type": "desktop", "pixel_ratio": 1, "browser_name": "Google Chrome", "do_not_track": false, "screen_width": 1920, "ip_lat_approx": 45.6959, "ip_lng_approx": 4.9424, "screen_height": 1200, "touch_support": true, "save_data_mode": false, "browser_version": "148", "client_datetime": "2026-05-17T22:07:01.305Z", "connection_type": "4g", "cookies_enabled": true, "server_datetime": "2026-05-17T22:06:52.707Z", "browser_language": "fr", "browser_languages": ["fr", "fr-FR", "en-US", "en"], "screen_orientation": "landscape", "connection_speed_mbps": 10}], "parametrage": {"id": 2, "mdp_admin": "admin123", "mdp_caisse": "caisse123", "updated_at": "2026-05-15T13:14:05.010Z", "evenement_id": 2, "vente_ouverte": true, "mdp_preparateur": "prep123", "allow_reprendre_commande": true, "temps_reservation_minutes": 20}, "reservations": [{"id": 150, "active": true, "expire_at": "2026-05-17T22:26:52.475Z", "article_id": 12, "commande_id": 63, "quantite_reservee": 3}], "commande_items": [{"id": 108, "quantite": 3, "article_id": 12, "updated_at": "2026-05-17T22:06:52.303Z", "commande_id": 63, "prix_unitaire": "2.00", "statut_livraison": "non_livre"}]}	2026-05-17 22:07:16.869726+00
\.


--
-- Data for Name: parametrage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parametrage (id, evenement_id, temps_reservation_minutes, mdp_caisse, mdp_preparateur, vente_ouverte, updated_at, allow_reprendre_commande, mdp_admin_local) FROM stdin;
1	1	1	caisse456	prep123	t	2026-05-17 09:03:09.708+00	t	admin123
2	2	20	caisse123	prep123	t	2026-05-15 13:14:05.010223+00	t	admin123
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservations (id, commande_id, article_id, quantite_reservee, expire_at, active) FROM stdin;
8	8	2	2	2026-05-16 21:37:33.831+00	f
9	8	3	1	2026-05-16 21:37:33.831+00	f
10	8	4	1	2026-05-16 21:37:33.831+00	f
1	1	1	1	2026-05-15 13:12:51.278+00	f
13	1	1	1	2026-05-16 21:41:48.684+00	f
101	50	7	1	2026-05-17 09:02:28.561+00	f
3	6	1	1	2026-05-15 22:32:18.238+00	f
4	6	2	1	2026-05-15 22:32:18.238+00	f
5	6	4	1	2026-05-15 22:32:18.238+00	f
14	6	2	1	2026-05-16 21:29:30.627+00	f
15	6	4	1	2026-05-16 21:29:30.627+00	f
16	6	1	1	2026-05-16 21:29:30.627+00	f
17	6	2	1	2026-05-16 21:31:52.743+00	f
18	6	4	1	2026-05-16 21:31:52.743+00	f
19	6	1	1	2026-05-16 21:31:52.743+00	f
6	7	5	1	2026-05-16 06:59:47.64+00	f
7	7	6	1	2026-05-16 06:59:47.64+00	f
11	7	5	1	2026-05-16 21:39:52.313+00	f
12	7	6	1	2026-05-16 21:39:52.313+00	f
102	50	11	1	2026-05-17 09:02:28.561+00	f
103	50	10	1	2026-05-17 09:02:28.561+00	f
32	10	5	1	2026-05-16 23:42:47.342+00	f
33	10	6	1	2026-05-16 23:42:47.342+00	f
34	10	9	2	2026-05-16 23:42:47.342+00	f
35	10	5	1	2026-05-16 23:45:38.639+00	f
36	10	6	1	2026-05-16 23:45:38.639+00	f
37	10	9	2	2026-05-16 23:45:38.639+00	f
38	10	5	1	2026-05-16 23:48:53.333+00	f
39	10	6	1	2026-05-16 23:48:53.333+00	f
2	4	1	1	2026-05-15 13:39:34.02+00	f
20	4	1	1	2026-05-16 21:51:25.452+00	f
21	4	7	1	2026-05-16 21:52:21.146+00	f
22	4	8	50	2026-05-16 21:52:21.146+00	f
23	4	1	1	2026-05-16 21:52:21.146+00	f
24	4	7	1	2026-05-16 22:37:42.653+00	f
25	4	8	50	2026-05-16 22:37:42.653+00	f
26	4	1	1	2026-05-16 22:37:42.653+00	f
27	4	7	1	2026-05-16 22:37:57.055+00	f
28	4	8	50	2026-05-16 22:37:57.055+00	f
29	4	1	1	2026-05-16 22:37:57.055+00	f
40	10	9	2	2026-05-16 23:48:53.333+00	f
30	9	5	1	2026-05-16 22:43:45.578+00	f
31	9	5	1	2026-05-16 22:45:30.772+00	f
41	10	3	2	2026-05-16 23:51:25.219+00	f
42	10	5	1	2026-05-16 23:51:25.219+00	f
43	10	6	1	2026-05-16 23:51:25.219+00	f
44	10	9	2	2026-05-16 23:51:25.219+00	f
45	11	3	3	2026-05-16 23:52:57.973+00	f
46	11	3	4	2026-05-16 23:53:52.677+00	f
47	12	5	1	2026-05-17 00:00:18.154+00	f
48	12	6	1	2026-05-17 00:00:18.154+00	f
49	13	5	1	2026-05-17 07:13:42.349+00	f
50	13	6	1	2026-05-17 07:13:42.349+00	f
51	13	5	1	2026-05-17 07:15:34.045+00	f
52	13	6	1	2026-05-17 07:15:34.045+00	f
53	15	5	1	2026-05-17 07:24:33.781+00	f
54	15	6	1	2026-05-17 07:24:33.781+00	f
55	15	10	1	2026-05-17 07:24:33.781+00	f
121	53	5	1	2026-05-17 10:18:15.164+00	f
122	53	9	1	2026-05-17 10:18:15.164+00	f
104	50	7	1	2026-05-17 09:04:48.342+00	f
105	50	11	1	2026-05-17 09:04:48.342+00	f
106	50	10	1	2026-05-17 09:04:48.342+00	f
89	50	7	1	2026-05-17 07:59:01.365+00	f
90	50	10	1	2026-05-17 07:59:01.365+00	f
91	50	11	1	2026-05-17 07:59:01.365+00	f
92	50	7	1	2026-05-17 08:01:32.64+00	f
93	50	10	1	2026-05-17 08:01:32.64+00	f
94	50	11	1	2026-05-17 08:01:32.64+00	f
95	50	7	1	2026-05-17 08:03:42.549+00	f
96	50	11	1	2026-05-17 08:03:42.549+00	f
97	50	10	1	2026-05-17 08:03:42.549+00	f
98	50	7	1	2026-05-17 08:50:51.106+00	f
99	50	11	1	2026-05-17 08:50:51.106+00	f
100	50	10	1	2026-05-17 08:50:51.106+00	f
56	17	6	1	2026-05-17 07:52:44.802+00	f
57	17	7	1	2026-05-17 07:52:44.802+00	f
58	17	11	1	2026-05-17 07:52:44.802+00	f
107	17	6	1	2026-05-17 09:06:51.383+00	f
108	17	7	1	2026-05-17 09:06:51.383+00	f
109	17	11	1	2026-05-17 09:06:51.383+00	f
110	17	6	1	2026-05-17 09:07:25.269+00	f
111	17	7	1	2026-05-17 09:07:25.269+00	f
112	17	11	1	2026-05-17 09:07:25.269+00	f
123	54	3	1	2026-05-17 10:24:37.134+00	f
124	54	5	1	2026-05-17 10:24:37.134+00	f
113	51	3	1	2026-05-17 09:15:19.065+00	f
114	51	7	1	2026-05-17 09:15:19.065+00	f
115	51	4	1	2026-05-17 09:15:19.065+00	f
116	51	3	1	2026-05-17 09:16:14.933+00	f
117	51	7	1	2026-05-17 09:16:14.933+00	f
118	51	4	1	2026-05-17 09:16:14.933+00	f
119	52	5	1	2026-05-17 09:40:25.975+00	f
120	52	7	1	2026-05-17 09:40:25.975+00	f
125	55	3	1	2026-05-17 10:57:23.987+00	f
126	55	5	1	2026-05-17 10:57:23.987+00	f
127	56	5	1	2026-05-17 10:58:23.051+00	f
128	56	6	1	2026-05-17 10:58:23.051+00	f
129	56	7	1	2026-05-17 10:58:23.051+00	f
141	60	5	1	2026-05-17 20:41:12.903+00	f
142	60	9	2	2026-05-17 20:41:12.903+00	f
136	13	5	1	2026-05-17 11:58:52.654+00	f
137	13	6	1	2026-05-17 11:58:52.654+00	f
130	57	3	1	2026-05-17 11:57:09.306+00	f
131	57	7	1	2026-05-17 11:57:09.306+00	f
132	57	4	1	2026-05-17 11:57:09.306+00	f
133	57	3	1	2026-05-17 11:58:22.161+00	f
134	57	7	1	2026-05-17 11:58:22.161+00	f
135	57	4	1	2026-05-17 11:58:22.161+00	f
138	57	3	1	2026-05-17 11:59:37.191+00	f
139	57	7	1	2026-05-17 11:59:37.191+00	f
140	57	4	1	2026-05-17 11:59:37.191+00	f
143	61	3	1	2026-05-17 21:16:59.602+00	f
144	61	5	1	2026-05-17 21:16:59.602+00	f
145	61	6	1	2026-05-17 21:16:59.602+00	f
146	61	7	1	2026-05-17 21:16:59.602+00	f
147	62	3	1	2026-05-17 21:26:40.239+00	f
148	62	5	1	2026-05-17 21:26:40.239+00	f
149	62	7	1	2026-05-17 21:26:40.239+00	f
150	63	12	3	2026-05-17 22:26:52.475+00	f
151	67	6	1	2026-05-22 20:22:37.467+00	f
152	67	5	1	2026-05-22 20:22:37.467+00	f
153	67	6	1	2026-05-22 20:24:04.714+00	f
154	67	5	1	2026-05-22 20:24:04.714+00	f
155	68	5	1	2026-05-22 20:34:48.633+00	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (token, role, event_slug, expires_at) FROM stdin;
iyutpgiuqcmqvfqme578kjjy1j54j	admin	festival-2026	2026-06-27 05:20:38.621+00
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, mdp_admin, updated_at, favicon_svg) FROM stdin;
1	admin123	2026-06-27 15:52:05.045493+00	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C53030"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><path d="M20 3 L8 17 H15 L12 29 L24 15 H17 Z" fill="white"/></svg>
\.


--
-- Name: articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.articles_id_seq', 12, true);


--
-- Name: commande_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.commande_items_id_seq', 111, true);


--
-- Name: commandes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.commandes_id_seq', 68, true);


--
-- Name: device_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_info_id_seq', 5, true);


--
-- Name: evenements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evenements_id_seq', 2, true);


--
-- Name: event_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_snapshots_id_seq', 2, true);


--
-- Name: parametrage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parametrage_id_seq', 2, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservations_id_seq', 155, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, true);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: commande_items commande_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commande_items
    ADD CONSTRAINT commande_items_pkey PRIMARY KEY (id);


--
-- Name: commandes commandes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT commandes_pkey PRIMARY KEY (id);


--
-- Name: device_info device_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_info
    ADD CONSTRAINT device_info_pkey PRIMARY KEY (id);


--
-- Name: evenements evenements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evenements
    ADD CONSTRAINT evenements_pkey PRIMARY KEY (id);


--
-- Name: evenements evenements_slug_url_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evenements
    ADD CONSTRAINT evenements_slug_url_unique UNIQUE (slug_url);


--
-- Name: event_snapshots event_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_snapshots
    ADD CONSTRAINT event_snapshots_pkey PRIMARY KEY (id);


--
-- Name: parametrage parametrage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametrage
    ADD CONSTRAINT parametrage_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: articles articles_evenement_id_evenements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_evenement_id_evenements_id_fk FOREIGN KEY (evenement_id) REFERENCES public.evenements(id) ON DELETE CASCADE;


--
-- Name: commande_items commande_items_commande_id_commandes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commande_items
    ADD CONSTRAINT commande_items_commande_id_commandes_id_fk FOREIGN KEY (commande_id) REFERENCES public.commandes(id) ON DELETE CASCADE;


--
-- Name: commandes commandes_evenement_id_evenements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT commandes_evenement_id_evenements_id_fk FOREIGN KEY (evenement_id) REFERENCES public.evenements(id) ON DELETE CASCADE;


--
-- Name: device_info device_info_order_id_commandes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_info
    ADD CONSTRAINT device_info_order_id_commandes_id_fk FOREIGN KEY (order_id) REFERENCES public.commandes(id) ON DELETE CASCADE;


--
-- Name: event_snapshots event_snapshots_event_id_evenements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_snapshots
    ADD CONSTRAINT event_snapshots_event_id_evenements_id_fk FOREIGN KEY (event_id) REFERENCES public.evenements(id) ON DELETE CASCADE;


--
-- Name: parametrage parametrage_evenement_id_evenements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametrage
    ADD CONSTRAINT parametrage_evenement_id_evenements_id_fk FOREIGN KEY (evenement_id) REFERENCES public.evenements(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_commande_id_commandes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_commande_id_commandes_id_fk FOREIGN KEY (commande_id) REFERENCES public.commandes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VaNj642ChI8yaVVNfrIxH5ChlSrduMudFhxqrKt9sXGQCPjpAczkzAbx2eIm11L

