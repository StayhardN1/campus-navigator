from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey

Base = declarative_base()

class Point(Base):
    __tablename__ = "points"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    qr_code = Column(String)
    floor = Column(Integer)
    type = Column(String)

class GraphEdge(Base):
    __tablename__ = "graph_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    from_point_id = Column(String)
    to_point_id = Column(String)
    weight = Column(Float)
    accessible = Column(Boolean)