import { 
    AspectRatio, 
    Box, 
    Button, 
    Center, 
    Flex, 
    Image, 
    Modal, 
    ModalBody, 
    ModalCloseButton, 
    ModalContent, 
    ModalFooter, 
    ModalHeader, 
    ModalOverlay, 
    Progress, 
    Text, 
    Tooltip, 
    useDisclosure, 
    useImage,
} from "@chakra-ui/react"; //https://chakra-ui.com/
import React, { useEffect, useRef, useState } from "react"; //react Library
import { useImmer } from "use-immer"; //React Hooks to Easily manage and update JavaScript objects and arrays
import { motion, useAnimate } from "framer-motion"; //animate Library

import './index.css'//引入样式  Import Style

//导入图片 Import Images
import flower1 from './images/flower1.png' 
import flower2 from './images/flower2.png'
import flower3 from './images/flower3.png'
import flower4 from './images/flower4.png'
import flower5 from './images/flower5.png'
import kettle from './images/kettle.png'
import kettleDropwater from './images/kettleDropwater.png'
import homeTheme from './images/homeTheme.png'
import bg from './images/bg.png'
import fail from './images/fail.png'

enum statusType { //游戏状态  Game State
    start = 'start',
    play = 'play',
    end = 'end'
}

enum endStatusType {
    success = 'success',
    failWithered = 'failWithered',
    failOutwater = 'failOutwater'
}

interface IChangeStaus { //props interface
    changeStatus:(status:statusType)=>void; // function to change game status
}

interface IEndProps extends IChangeStaus {
    successSignal:endStatusType; // signal for success or not
    initGame:any;// function to init game data
}

interface IFlower { //flower entity interface
    maxHP:number;//花最大水量 maximum water volume
    HP:number;//花剩余水量 surplus water
    attrition:number;//流失速度 loss rate
    level:number; //成长等级 growth level
    levelMax:number; //等级最大值 maximum level value
    maxGrowth:number;//升级需要的时间 time required for upgrade
    growthRate:number;//成长速度 growth rate
    currentExep:number;//当前经验 current experience
}

interface IKettle { //kettle entity interface
    waterVolume:number;//一次给花浇水的量
    leakageVolume:number;//漏水量
    waterLeakageVolume:number;//浇花时漏水量
    HP:number;//水壶剩余水量 kettle surplus water 
    maxHP:number;//水壶最大水量 maximum water volume of kettle
}

interface IstageOfColor { // interface: stage of color
    stage:number;
    color:string;
}

//初始化花朵属性值 Initialize flower attribute values
const initFlower:IFlower = {
    maxHP:100,
    HP:100, 
    attrition:10,
    level:1,
    levelMax:5,
    maxGrowth:10,
    growthRate:2,
    currentExep:0
}

//初始化水壶属性值 Initialize kettle attribute values
const initKettle:IKettle = {
    HP:520,
    maxHP:520,
    waterVolume:40,
    leakageVolume:10,
    waterLeakageVolume:20
}

//Initialize stage of color
const initStageOfColors:IstageOfColor[] = [
    {
        stage:40,
        color:'#5987f7'
    },
    {
        stage:70,
        color:'#f19b29'
    },
    {
        stage:100,
        color:'#dc3d3d'
    }
]

//花成长图片顺序 growth img-sequence
const sequence = [flower1,flower2,flower3,flower4,flower5];

//目标：保证你的花不缺水分和水壶里的水不能用光
//Goal: Ensure that your flowers are not short of water and that the water in the kettle cannot be used up

//main program
const Water: React.FC = () => { //主程序FC
    const [status, updateStatus] = useImmer<statusType>(statusType.start);
    function changeStatus(status:statusType){
        updateStatus(status);
    }
    return (
        <Center width={'100vw'} height={'100vh'}>
            <Box width={'80%'} height={'100%'} maxW={800}>
                <Flex width={'100%'} height={'100%'} flexDir={'column'} justifyContent={'center'} alignItems={'center'}>
                    {
                        status == statusType.start ? 
                            <StartPart changeStatus={changeStatus} /> : 
                                <PlayPart changeStatus={changeStatus} />
                    }
                </Flex>
            </Box>
        </Center>
    )
}

//开始界面 start page
const StartPart: React.FC<IChangeStaus> = ({changeStatus}) => {
    const homeLoadStatus = useImage({src:homeTheme});
    return (
        homeLoadStatus!=='loaded'?
        <Loading />:
            <Flex flexDir={'column'} justifyContent={'center'} alignItems={'center'} position={'relative'} width={'100%'} height={'100%'}>
                <Text fontSize={18} fontWeight={600}>Cherish every drop of water, make life more beautiful!</Text>
                <Text fontSize={18} fontWeight={400}>Grow up your flower</Text>
                <Flex 
                    flexDir={'column'} 
                    justifyContent={'center'} 
                    alignItems={'center'} 
                    position={'relative'} 
                    width={'100%'} 
                    height={'60%'} 
                    margin={'15px 0'}
                >
                    <Image src={homeTheme} position={'absolute'} zIndex={-1} height={'100%'}/>
                </Flex>
                <Button onClick={()=>{
                        changeStatus(statusType.play);
                    }}>Start game</Button>
            </Flex>
    )
}

//游玩界面 play page
const PlayPart: React.FC<IChangeStaus> = ({changeStatus}) => {
    const [flowerEntity,updateFlower] = useImmer(initFlower);//初始化花朵 define flower entity and function to update flower attributes
    const [kettleEntity,updateKettle] = useImmer(initKettle);//初始化水壶 define kettle entity and function to update kettle attributes
    const [dropwaterScope, animate] = useAnimate();//浇花动画 watering Animation
    const [levelScope, animateLevel] = useAnimate();//level+1动画 level+1 Animation
    const hpTimer = useRef<any>();//水量定时器 water timer
    const expTimer = useRef<any>();//成长定时器 grouth timer
    const leakageTimer = useRef<any>();//漏水定时器 leakage timer
    const bgLoadStatus = useImage({src:bg});//背景图片加载状态 background image loading status
    const [startSymbol,setStartSymbol] = useState(false);

    const percentage = (flowerEntity.maxHP-flowerEntity.HP)/flowerEntity.maxHP*100; //百分比 rest water perentage
    const showFlower = sequence[flowerEntity.level-1]; //展示花 corresponding flower for each stage
    //颜色 rest water color
    let waterStatusColor = percentage<=initStageOfColors[0].stage?initStageOfColors[0].color:
                                percentage<=initStageOfColors[1].stage?initStageOfColors[1].color:
                                    initStageOfColors[2].color;
    
    
    let ifEnd = false; //结束标志符 end flag
    let endStatus = endStatusType.success;

    //如果水量跌至0及以下，失败结束游戏  
    //If the water volume drops to 0 or below, the game ends with a failure,and clear all timer
    if(flowerEntity.HP<=0){
        
        clearInterval(hpTimer.current);
        clearInterval(expTimer.current);
        clearInterval(leakageTimer.current);
        ifEnd = true;
        endStatus = endStatusType.failWithered;
    }
    //如果成长最大等级，成功结束游戏 
    //If you grow to the maximum level and successfully end the game,and clear all timer
    if(flowerEntity.level>=flowerEntity.levelMax){

        clearInterval(hpTimer.current);
        clearInterval(expTimer.current);
        clearInterval(leakageTimer.current);
        ifEnd = true;
        endStatus = endStatusType.success;
    }
    //如果水壶水没有了，失败结束游戏
    //If the kettle runs out of water, the game ends with failure
    if(kettleEntity.HP<=0){
        clearInterval(hpTimer.current);
        clearInterval(expTimer.current);
        clearInterval(leakageTimer.current);
        ifEnd = true;
        endStatus = endStatusType.failOutwater;
    }

    //加载完成时执行，生命周期，只执行一次
    //Execute upon completion of loading, lifecycle, only once
    useEffect(()=>{//  设置water时间 set water timer
        return ()=>{
            //清除时间器，避免造成内存泄漏
            //Clear the timer to avoid memory leaks
            if(hpTimer.current){
                clearInterval(hpTimer.current);
                hpTimer.current = null;
            }
            
        }
    },[])

    //设置成长时间
    //set grouth timer
    useEffect(()=>{
        return ()=>{
            //清除时间器，避免造成内存泄漏
            //Clear the timer to avoid memory leaks
            if(expTimer.current){
                clearInterval(expTimer.current);
                expTimer.current = null;
            }
            
        }
    },[])

    //设置漏水时间
    //set leakage timer
    useEffect(()=>{
        return ()=>{
            if(leakageTimer.current){
                clearInterval(leakageTimer.current);
                leakageTimer.current = null;
            }
            
        }
    },[])

    //dropwater animate
    async function dropwaterAni(){
        await animate(dropwaterScope.current, { x: [110,170,110],opacity: [0,0.5,1,0],y:[160,180,200,180] }, { duration: 1.5 })
    }
    //level+1 animate
    async function levelAni(){
        await animateLevel(levelScope.current,{opacity:[1,0.6,0],y:[-160,-190]},{ duration: 1 })
    }
    function initGame(){ // function to init game
        updateFlower(initFlower);
        updateKettle(initKettle);
        hpTimer.current = setInterval(()=>{
            updateFlower(draft=>{
                draft.HP = draft.HP - draft.attrition;
            })
        },1000)
        expTimer.current = setInterval(()=>{
            updateFlower(draft=>{
                draft.currentExep += draft.growthRate;
                if(draft.currentExep>=draft.maxGrowth){//处理成长值边界 handle growth value boundaries
                    draft.currentExep = 0;
                    draft.level+=1;
                    levelAni();
                }
            })
        },1000)
        leakageTimer.current = setInterval(()=>{
            updateKettle(draft=>{
                draft.HP-=draft.leakageVolume;
                if(draft.HP<0){
                    draft.HP = 0;
                }
            })
        },500)
    }

    return (
        <>
            {
                bgLoadStatus!=='loaded'?<Loading />:(
                    <>
                        {ifEnd&&<EndPart initGame={initGame} changeStatus={changeStatus} successSignal={endStatus}/>}
                        <Modal isOpen={!startSymbol} onClose={()=>{
                            setStartSymbol(true);
                            initGame();
                        }}>
                            <ModalOverlay />
                            <ModalContent>
                            <ModalHeader>Goal: </ModalHeader>
                            <ModalCloseButton />
                            <ModalBody>
                                Ensure your flowers are not short of water and that the water in the leaky jug cannot be used up
                            </ModalBody>

                            <ModalFooter>
                                <Button colorScheme='blue' mr={3} onClick={()=>{
                                    setStartSymbol(true);
                                    initGame();
                                }}>
                                    Ok!
                                </Button>
                            </ModalFooter>
                            </ModalContent>
                        </Modal>
                        <Flex justifyContent={'space-between'} w={'100%'}>
                            <Flex minW='200px' flexDirection={'column'} alignItems={'center'}>
                                <Box 
                                    w={5} 
                                    position={'relative'} 
                                    h={150} 
                                    border={'1px solid gray'} 
                                    borderRadius={'8'} 
                                    marginBottom={'3'} 
                                    overflow={'hidden'}
                                >
                                    <Box 
                                        w={'100%'} 
                                        h={'100%'} 
                                        backgroundColor={waterStatusColor} 
                                        position={'absolute'} 
                                        transition={'0.3s'} 
                                        top={percentage+'%'}
                                    />
                                </Box>
                                <Text fontWeight={600}>
                                    flower hp:{flowerEntity.HP}% 
                                </Text>
                                <Text  fontWeight={600} fontSize={20} marginTop={10}>
                                    current level:{flowerEntity.level} 
                                </Text>
                                
                                
                            </Flex>
                            
                            <Flex 
                                justifyContent={'center'} 
                                overflow={'hidden'} 
                                alignItems={'end'} 
                                position={'relative'} 
                                minW={340} 
                                minH={400} 
                            >
                                {/* background img */}
                                <Image src={bg} w={340} h={400} position={'absolute'} top={0} left={0}/>
                                {/* dropwater */}
                                <Box ref={dropwaterScope} position={'relative'} width={'100%'} h={'100%'} opacity={0} zIndex={10}>
                                    <Image src={kettleDropwater} h={'100'} position={'absolute'} transform={'rotate(-70deg)'}/>
                                </Box>
                                {/* growth flower */}
                                <Image src={showFlower} h={'220'} position={'absolute'} bottom={3} transition={'0.5s'}/>
                                {/* level +1 */}
                                <Text ref={levelScope} position={'absolute'} fontWeight={600} color={'red'} opacity={0} fontSize={18}>level +1</Text>
                            </Flex>
                            
                            <Box minW='200px' height={'100%'}>
                                <AspectRatio minW={150} margin={'0 auto'} 
                                onClick={()=>{
                                    if(ifEnd)return;
                                    //water点击事件 water click event
                                    dropwaterAni();
                                    updateFlower(draft=>{
                                        draft.HP += kettleEntity.waterVolume;//加水量  Add water volume
                                        if(draft.HP>flowerEntity.maxHP){//handle boundary
                                            draft.HP = flowerEntity.maxHP;
                                        }
                                    })
                                    updateKettle(draft=>{
                                        draft.HP-= draft.waterLeakageVolume;//浇水时耗水量 Water consumption during watering
                                        if(draft.HP<0){
                                            draft.HP = 0;
                                        }
                                    })
                                }}
                                _hover={{cursor:'pointer'}}
                                >
                                    <motion.div
                                    className="box"
                                    /**
                                     * Setting the initial keyframe to "null" will use
                                     * the current value to allow for interruptable keyframes.
                                     */
                                    whileHover={{ scale: [null, 1.5, 1.4] }}
                                    transition={{ duration: 0.3 }}
                                    >
                                        <Tooltip label='water' hasArrow  placement='top'>
                                            <Image src={kettle}/>
                                        </Tooltip>
                                        
                                    </motion.div>
                                    
                                </AspectRatio>
                                <Flex w={150} margin={'0 auto'} flexDirection={'column'} alignItems={'center'}>
                                    <Box 
                                        w={'100%'}
                                        position={'relative'} 
                                        h={3}
                                        border={'1px solid gray'} 
                                        borderRadius={'8'} 
                                        marginBottom={'3'} 
                                        overflow={'hidden'}
                                    >
                                        <Box 
                                            w={'100%'} 
                                            h={'100%'} 
                                            backgroundColor={'#5987f7'} 
                                            position={'absolute'} 
                                            transition={'0.3s'} 
                                            right={(kettleEntity.maxHP-kettleEntity.HP)/kettleEntity.maxHP*100+'%'}
                                        />
                                    </Box>
                                    <Text fontWeight={600}>left water:{kettleEntity.HP}</Text>
                                </Flex>
                                
                            </Box>
                        </Flex>
                    </>
                )
            }
            
        </>
    )
}

//结束界面 end page
const EndPart: React.FC<IEndProps> = ({changeStatus,successSignal,initGame}) => {
    const { isOpen, onOpen, onClose } = useDisclosure({isOpen:true});

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose}
                motionPreset='scale'
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{successSignal===endStatusType.success?'Congratulations!':'Game over!'}</ModalHeader>
                    <ModalBody>
                        <Flex width={'100%'} height={'100%'} flexDir={'column'} justifyContent={'center'} alignItems={'center'}>
                            {successSignal===endStatusType.success?(
                                <>
                                    <Image src={sequence[4]} h={'220'}/>
                                    <Text margin={'2'}>You conserve water,</Text>
                                    <Text marginBottom={3}>And you get a beautiful flower!</Text>
                                </>
                                    
                                ):successSignal===endStatusType.failWithered?(
                                <>
                                    <Image src={fail} h={'220'}/>
                                    <Text margin={'5'}>Your flower is withered</Text>
                                </>    
                                
                                ):(
                                <>
                                    <Image src={fail} h={'220'}/>
                                    <Text margin={'2'}>You waste water and</Text>
                                    <Text marginBottom={3}>run out of water in your kettle</Text>
                                </>
                                )
                            }
                            <Flex >
                                <Button onClick={()=>{
                                    changeStatus(statusType.start);
                                }}>Home</Button>
                                <Button onClick={()=>{
                                    initGame();
                                }} marginLeft={5}>Restart</Button>
                            </Flex>
                            
                        </Flex>
                        
                    </ModalBody>
                </ModalContent>
            </Modal>
            
        </>
    )
}

//加载页面 loading page
const Loading:React.FC = ()=>{
    return (
        <Text fontSize={20}>
            loading...
        </Text>
    )
}


export default Water;