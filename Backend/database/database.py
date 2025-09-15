import os
import dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

dotenv.load_dotenv()

username = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")
host = os.getenv("DB_HOST")
db_name = os.getenv("DB_NAME")
port = os.getenv("DB_PORT")

db_url = f"postgresql://{username}:{password}@{host}:{port}/{db_name}"

engine = create_engine(db_url)
sessionLocal = sessionmaker(autocommit = False, autoflush= False, bind = engine)
Base = declarative_base()