--
-- PostgreSQL database dump
--

\restrict gAa2eW15cpODSjuVYFm3noOJMWtzbJo6jP6TNh9CAP3evazCKhuLYY6sN93Ek2h

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: competitor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competitor (
    id integer NOT NULL,
    input_url character varying(500),
    instagram_id character varying(100) NOT NULL,
    username character varying(100) NOT NULL,
    url character varying(500),
    full_name character varying(200),
    full_name_zh character varying(200),
    biography text,
    biography_zh text,
    profile_pic_url text,
    profile_pic_base64 text,
    external_urls jsonb,
    external_url text,
    external_url_shimmed text,
    followers_count integer DEFAULT 0,
    follows_count integer DEFAULT 0,
    posts_count integer DEFAULT 0,
    has_channel boolean DEFAULT false,
    highlight_reel_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.competitor OWNER TO postgres;

--
-- Name: competitor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.competitor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.competitor_id_seq OWNER TO postgres;

--
-- Name: competitor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.competitor_id_seq OWNED BY public.competitor.id;


--
-- Name: mypost; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mypost (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id character varying(255) NOT NULL,
    display_url_base64 text,
    video_url_base64 text,
    images_base64 jsonb,
    jianyi1 text,
    jianyi2 text,
    jianyi3 text,
    post_type character varying(50),
    prompt text,
    new_display_url_base64 text,
    new_images_base64 jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    prompt_array jsonb
);


ALTER TABLE public.mypost OWNER TO postgres;

--
-- Name: mypost_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mypost_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mypost_id_seq OWNER TO postgres;

--
-- Name: mypost_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mypost_id_seq OWNED BY public.mypost.id;


--
-- Name: mypostl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mypostl (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id character varying(255) NOT NULL,
    display_url_base64 text,
    video_url_base64 text,
    images_base64 jsonb,
    jianyi1 text,
    jianyi2 text,
    jianyi3 text,
    post_type character varying(50),
    prompt text,
    new_display_url_base64 text,
    new_images_base64 jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    prompt_array jsonb,
    new_video_url_base64 text,
    jianyi4 text
);


ALTER TABLE public.mypostl OWNER TO postgres;

--
-- Name: mypostl_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mypostl_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mypostl_id_seq OWNER TO postgres;

--
-- Name: mypostl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mypostl_id_seq OWNED BY public.mypostl.id;


--
-- Name: popular; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.popular (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id character varying(255) NOT NULL,
    images_base64 jsonb,
    jianyi1 text,
    jianyi2 text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    jianyi3 text,
    post_type character varying(50),
    "jianyi1.5" text,
    success text,
    display_url_base64 jsonb,
    video_url_base64 jsonb,
    prompt text,
    prompt_array jsonb
);


ALTER TABLE public.popular OWNER TO postgres;

--
-- Name: COLUMN popular.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.popular.created_at IS '鍒涘缓鏃堕棿';


--
-- Name: COLUMN popular.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.popular.updated_at IS '鏇存柊鏃堕棿';


--
-- Name: popular_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.popular_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.popular_id_seq OWNER TO postgres;

--
-- Name: popular_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.popular_id_seq OWNED BY public.popular.id;


--
-- Name: post_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_data (
    id integer NOT NULL,
    post_id character varying(100) NOT NULL,
    post_type character varying(50),
    short_code character varying(50),
    url text,
    input_url text,
    caption text,
    caption_zh text,
    alt text,
    alt_zh text,
    hashtags jsonb,
    hashtags_zh jsonb,
    mentions jsonb,
    comments_count integer DEFAULT 0,
    likes_count integer DEFAULT 0,
    is_comments_disabled boolean DEFAULT false,
    first_comment text,
    first_comment_zh text,
    latest_comments jsonb,
    latest_comments_zh jsonb,
    dimensions_height integer,
    dimensions_width integer,
    display_url text,
    display_url_base64 text,
    video_url text,
    video_url_base64 text,
    video_duration numeric(10,3),
    images jsonb,
    images_base64 jsonb,
    child_posts jsonb,
    owner_id character varying(100),
    owner_username character varying(100),
    owner_full_name character varying(200),
    owner_full_name_zh character varying(200),
    "timestamp" timestamp without time zone,
    is_pinned boolean DEFAULT false,
    is_sponsored boolean DEFAULT false,
    product_type character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    videos jsonb,
    videos_base64 jsonb,
    child_posts_order jsonb,
    video_view_count bigint DEFAULT 0,
    video_play_count bigint DEFAULT 0,
    competitor_id integer,
    search_id integer,
    CONSTRAINT check_data_source CHECK ((((competitor_id IS NOT NULL) AND (search_id IS NULL)) OR ((competitor_id IS NULL) AND (search_id IS NOT NULL))))
);


ALTER TABLE public.post_data OWNER TO postgres;

--
-- Name: post_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.post_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_data_id_seq OWNER TO postgres;

--
-- Name: post_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.post_data_id_seq OWNED BY public.post_data.id;


--
-- Name: search; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search (
    id integer NOT NULL,
    keyword character varying(200) NOT NULL,
    search_count integer DEFAULT 0,
    total_posts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    keyword_zh text
);


ALTER TABLE public.search OWNER TO postgres;

--
-- Name: COLUMN search.keyword_zh; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.search.keyword_zh IS '关键词的中文翻译';


--
-- Name: search_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.search_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.search_id_seq OWNER TO postgres;

--
-- Name: search_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.search_id_seq OWNED BY public.search.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: competitor id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor ALTER COLUMN id SET DEFAULT nextval('public.competitor_id_seq'::regclass);


--
-- Name: mypost id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypost ALTER COLUMN id SET DEFAULT nextval('public.mypost_id_seq'::regclass);


--
-- Name: mypostl id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypostl ALTER COLUMN id SET DEFAULT nextval('public.mypostl_id_seq'::regclass);


--
-- Name: popular id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.popular ALTER COLUMN id SET DEFAULT nextval('public.popular_id_seq'::regclass);


--
-- Name: post_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_data ALTER COLUMN id SET DEFAULT nextval('public.post_data_id_seq'::regclass);


--
-- Name: search id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search ALTER COLUMN id SET DEFAULT nextval('public.search_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: competitor competitor_instagram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor
    ADD CONSTRAINT competitor_instagram_id_key UNIQUE (instagram_id);


--
-- Name: competitor competitor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor
    ADD CONSTRAINT competitor_pkey PRIMARY KEY (id);


--
-- Name: mypost mypost_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypost
    ADD CONSTRAINT mypost_pkey PRIMARY KEY (id);


--
-- Name: mypost mypost_user_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypost
    ADD CONSTRAINT mypost_user_id_post_id_key UNIQUE (user_id, post_id);


--
-- Name: mypostl mypostl_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypostl
    ADD CONSTRAINT mypostl_pkey PRIMARY KEY (id);


--
-- Name: mypostl mypostl_user_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypostl
    ADD CONSTRAINT mypostl_user_id_post_id_key UNIQUE (user_id, post_id);


--
-- Name: popular popular_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.popular
    ADD CONSTRAINT popular_pkey PRIMARY KEY (id);


--
-- Name: post_data post_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_data
    ADD CONSTRAINT post_data_pkey PRIMARY KEY (id);


--
-- Name: post_data post_data_post_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_data
    ADD CONSTRAINT post_data_post_id_key UNIQUE (post_id);


--
-- Name: search search_keyword_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search
    ADD CONSTRAINT search_keyword_key UNIQUE (keyword);


--
-- Name: search search_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search
    ADD CONSTRAINT search_pkey PRIMARY KEY (id);


--
-- Name: popular unique_user_post; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.popular
    ADD CONSTRAINT unique_user_post UNIQUE (user_id, post_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user user_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_username_key UNIQUE (username);


--
-- Name: idx_competitor_followers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_competitor_followers ON public.competitor USING btree (followers_count DESC);


--
-- Name: idx_competitor_instagram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_competitor_instagram_id ON public.competitor USING btree (instagram_id);


--
-- Name: idx_competitor_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_competitor_username ON public.competitor USING btree (username);


--
-- Name: idx_mypost_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypost_created_at ON public.mypost USING btree (created_at DESC);


--
-- Name: idx_mypost_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypost_post_id ON public.mypost USING btree (post_id);


--
-- Name: idx_mypost_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypost_user_id ON public.mypost USING btree (user_id);


--
-- Name: idx_mypostl_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypostl_created_at ON public.mypostl USING btree (created_at DESC);


--
-- Name: idx_mypostl_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypostl_post_id ON public.mypostl USING btree (post_id);


--
-- Name: idx_mypostl_prompt_array; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypostl_prompt_array ON public.mypostl USING gin (prompt_array);


--
-- Name: idx_mypostl_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mypostl_user_id ON public.mypostl USING btree (user_id);


--
-- Name: idx_popular_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_popular_post_id ON public.popular USING btree (post_id);


--
-- Name: idx_popular_post_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_popular_post_type ON public.popular USING btree (post_type);


--
-- Name: idx_popular_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_popular_user_id ON public.popular USING btree (user_id);


--
-- Name: idx_post_data_competitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_competitor_id ON public.post_data USING btree (competitor_id);


--
-- Name: idx_post_data_likes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_likes ON public.post_data USING btree (likes_count DESC);


--
-- Name: idx_post_data_owner_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_owner_username ON public.post_data USING btree (owner_username);


--
-- Name: idx_post_data_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_post_id ON public.post_data USING btree (post_id);


--
-- Name: idx_post_data_post_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_post_type ON public.post_data USING btree (post_type);


--
-- Name: idx_post_data_search_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_search_id ON public.post_data USING btree (search_id);


--
-- Name: idx_post_data_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_data_timestamp ON public.post_data USING btree ("timestamp" DESC);


--
-- Name: idx_search_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_created_at ON public.search USING btree (created_at DESC);


--
-- Name: idx_search_keyword; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_keyword ON public.search USING btree (keyword);


--
-- Name: popular fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.popular
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: mypost mypost_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypost
    ADD CONSTRAINT mypost_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: mypostl mypostl_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mypostl
    ADD CONSTRAINT mypostl_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: post_data post_data_competitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_data
    ADD CONSTRAINT post_data_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES public.competitor(id) ON DELETE CASCADE;


--
-- Name: post_data post_data_search_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_data
    ADD CONSTRAINT post_data_search_id_fkey FOREIGN KEY (search_id) REFERENCES public.search(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gAa2eW15cpODSjuVYFm3noOJMWtzbJo6jP6TNh9CAP3evazCKhuLYY6sN93Ek2h

