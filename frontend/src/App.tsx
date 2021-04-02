import React, {useEffect, useState} from 'react';
import './App.css';
import axios from "axios";
import {Carousel} from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.css'

function App() {
    const baseUri: String = process.env.REACT_APP_API_URL!;
    console.log(baseUri);

    const [allPhotos, setAllPhotos] = useState([]);

    async function fetchPhotos() {
        const {data} = await axios.get(baseUri + 'getPhotos');
        setAllPhotos(data);
    }

    useEffect(() => {
        fetchPhotos();
    }, [])

    function getCarouselImage(photo: any) {
        return (
        <Carousel.Item interval={1000} style={{height : 350 }}>
            <img src={photo.url} alt={photo.filename} className='h-100'/>
            <Carousel.Caption>
                <h3 style={{backgroundColor: 'rgba(0,0,0,.3)'}}>{photo.filename}</h3>
            </Carousel.Caption>
        </Carousel.Item>
        );
    }

    return (
        <div className="App bg-secondary min-vh-100">
            <h1 className='display-3 p-3 mb-5'>
                Super Mario and friends
            </h1>
            <Carousel>
                {allPhotos.map(photo => getCarouselImage(photo))}
            </Carousel>
        </div>
    );
}

export default App;
